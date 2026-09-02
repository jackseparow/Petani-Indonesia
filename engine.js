/**
 * Core Engine & Controller: Petani Bijaksana
 */
class PetaniBijaksanaEngine {
  constructor(cropsData, initialSoilHealth = 100, waterBank = 100) {
    this.cropsData = cropsData;
    this.soilHealth = initialSoilHealth;
    this.waterBank = waterBank;
    this.season = 1;
    this.totalMoney = 0;
    
    // Konstanta Ekologis Matematika (Naskah Akademik)
    this.ALPHA = 0.2; // Booster Kimia
    this.OMEGA = 0.1; // Kontribusi Penyerbukan Lebah
    this.BETA = 0.5;  // Konversi Humus Alami
    this.DELTA = 0.05; // Degradasi Residu Kimia
  }

  processSeason(plotAllocations, damagedCropHumus = 0, chemicalBooster = 0) {
    let waterNeeded = 0;
    let beeIndex = 0;

    // 1. Kalkulasi Konsumsi Air & Daya Tarik Lebah
    plotAllocations.forEach(item => {
      const crop = this.cropsData.find(c => c.id === item.cropId);
      if (crop) {
        waterNeeded += crop.water_needed;
        beeIndex += crop.bee_attraction;
      }
    });

    // Faktor Penalti Air (lambda_t)
    const lambdaWater = waterNeeded <= this.waterBank ? 1.0 : (this.waterBank / Math.max(1, waterNeeded));

    // 2. Kalkulasi Panen, Oksigen, dan Nutrisi Tanah
    let seasonHarvestIncome = 0;
    let seasonOxygen = 0;
    let totalSoilNutrientDrain = 0;
    let totalSoilRecovery = 0;

    plotAllocations.forEach(item => {
      const crop = this.cropsData.find(c => c.id === item.cropId);
      if (crop) {
        // Formulasi Hasil Panen (Y_i,t)
        const yieldMultiplier = (this.soilHealth / 100) * lambdaWater * (1 + this.OMEGA * beeIndex) * (1 + this.ALPHA * Math.sqrt(chemicalBooster));
        const actualYield = crop.base_yield * yieldMultiplier;

        seasonHarvestIncome += actualYield * crop.price_per_unit;
        seasonOxygen += crop.oxygen_yield * (this.soilHealth / 100);

        if (crop.soil_impact > 0) {
          totalSoilRecovery += crop.soil_impact;
        } else {
          totalSoilNutrientDrain += actualYield * Math.abs(crop.soil_impact / 20);
        }
      }
    });

    this.totalMoney += seasonHarvestIncome;

    // 3. Transisi Kesuburan Tanah Musim Berikutnya (H_t+1)
    const humusBonus = this.BETA * damagedCropHumus;
    const chemicalDegradation = this.DELTA * Math.pow(chemicalBooster, 2);

    const nextSoilHealth = this.soilHealth + totalSoilRecovery + humusBonus - totalSoilNutrientDrain - chemicalDegradation;
    this.soilHealth = Math.min(100, Math.max(0, nextSoilHealth));

    const result = {
      season: this.season,
      harvestIncome: Math.round(seasonHarvestIncome),
      totalMoney: Math.round(this.totalMoney),
      waterNeeded: waterNeeded,
      isWaterDeficit: waterNeeded > this.waterBank,
      oxygenProduced: Math.round(seasonOxygen),
      beeIndex: beeIndex,
      nextSoilHealth: Math.round(this.soilHealth * 10) / 10
    };

    this.season += 1;
    return result;
  }
}

// Global UI State Management
let engine;
let crops = [];
let gridPlots = Array(10).fill(null);
let activePlotIndex = null;

document.addEventListener("DOMContentLoaded", () => {
  fetch('crops.json')
    .then(res => res.json())
    .then(data => {
      crops = data.master_crops;
      engine = new PetaniBijaksanaEngine(crops, 100, 100);
      initFarmGrid();
      populateCropModal();
      updatePreview();
    });
});

function initFarmGrid() {
  const gridEl = document.getElementById('farm-grid');
  gridEl.innerHTML = '';
  gridPlots.forEach((cropId, index) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.onclick = () => openCropSelector(index);
    
    if (cropId) {
      const crop = crops.find(c => c.id === cropId);
      tile.innerHTML = `<span class="tile-icon">🌱</span><br><b>${crop.name}</b>`;
      tile.classList.add('planted');
    } else {
      tile.innerHTML = `<span class="tile-add">+</span><br><small>Petak ${index + 1}</small>`;
    }
    gridEl.appendChild(tile);
  });
}

function openCropSelector(index) {
  activePlotIndex = index;
  document.getElementById('crop-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('crop-modal').style.display = 'none';
}

function populateCropModal() {
  const listEl = document.getElementById('modal-crop-list');
  listEl.innerHTML = '<div class="crop-option" onclick="selectCrop(null)">❌ <i>Kosongkan Petak Ini</i></div>';
  crops.forEach(crop => {
    listEl.innerHTML += `
      <div class="crop-option" onclick="selectCrop('${crop.id}')">
        <b>${crop.name}</b> (${crop.category})<br>
        <small>💧 Air: ${crop.water_needed} | 🌿 Dampak Tanah: ${crop.soil_impact} | 🐝 Lebah: ${crop.bee_attraction}</small>
      </div>
    `;
  });
}

function selectCrop(cropId) {
  gridPlots[activePlotIndex] = cropId;
  closeModal();
  initFarmGrid();
  updatePreview();
}

function updatePreview() {
  let waterTotal = 0;
  gridPlots.forEach(cropId => {
    if (cropId) {
      const crop = crops.find(c => c.id === cropId);
      waterTotal += crop.water_needed;
    }
  });

  const waterBar = document.getElementById('preview-water');
  waterBar.innerText = `${waterTotal} / 100 Unit`;
  waterBar.style.color = waterTotal > 100 ? '#dc2626' : '#166534';
}

function runSeasonSimulation() {
  const allocations = gridPlots
    .filter(id => id !== null)
    .map(id => ({ cropId: id }));

  const humus = parseInt(document.getElementById('inp-humus').value) || 0;
  const booster = parseInt(document.getElementById('inp-booster').value) || 0;

  const res = engine.processSeason(allocations, humus, booster);

  document.getElementById('lbl-season').innerText = res.season;
  document.getElementById('lbl-soil').innerText = `${res.nextSoilHealth}%`;
  document.getElementById('lbl-money').innerText = `Rp ${res.totalMoney.toLocaleString('id-ID')}`;

  const logEl = document.getElementById('log-content');
  logEl.innerHTML = `
    <div class="log-entry">
      <b>=== LAPORAN PETANI BIJAKSANA (MUSIM ${res.season - 1}) ===</b><br>
      • Pendapatan Panen   : Rp ${res.harvestIncome.toLocaleString('id-ID')}<br>
      • Total Kas Uang     : Rp ${res.totalMoney.toLocaleString('id-ID')}<br>
      • Penggunaan Air     : ${res.waterNeeded} / 100 Unit ${res.isWaterDeficit ? '⚠️ (KRISIS AIR!)' : '✅'}<br>
      • Produksi Oksigen   : ${res.oxygenProduced} Poin<br>
      • Indeks Lebah       : ${res.beeIndex} Poin<br>
      • Kesehatan Tanah    : ${res.nextSoilHealth}%
    </div>
  ` + logEl.innerHTML;
}
