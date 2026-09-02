/**
 * Engine Logika Matematika Taman Numerasi: Sustainable Farming
 */
class SustainableFarmingEngine {
  constructor(cropsData, initialSoilHealth = 100, waterBank = 100) {
    this.cropsData = cropsData;
    this.soilHealth = initialSoilHealth;
    this.waterBank = waterBank;
    this.season = 1;
    this.totalMoney = 0;
    
    // Konstanta Ekologis (berdasarkan Naskah Akademik)
    this.ALPHA = 0.2; // Booster Kimia
    this.OMEGA = 0.1; // Kontribusi Lebah
    this.BETA = 0.5;  // Konversi Humus
    this.DELTA = 0.05; // Degradasi Residu Kimia
  }

  processSeason(plotAllocations, damagedCropHumus = 0, damagedCropSold = 0, chemicalBooster = 0) {
    let waterNeeded = 0;
    let beeIndex = 0;

    // 1. Kalkulasi Konsumsi Air & Daya Tarik Lebah
    plotAllocations.forEach(item => {
      const crop = this.cropsData.find(c => c.id === item.cropId);
      if (crop) {
        waterNeeded += item.plots * crop.water_needed;
        beeIndex += item.plots * crop.bee_attraction;
      }
    });

    // Faktor Penalti Air (lambda_t)
    const lambdaWater = waterNeeded <= this.waterBank ? 1.0 : (this.waterBank / Math.max(1, waterNeeded));

    // 2. Kalkulasi Panen, Oksigen, dan Dampak Nutrisi Lahan
    let seasonHarvestIncome = 0;
    let seasonOxygen = 0;
    let totalSoilNutrientDrain = 0;
    let totalSoilRecovery = 0;

    plotAllocations.forEach(item => {
      const crop = this.cropsData.find(c => c.id === item.cropId);
      if (crop) {
        // Rumus Panen Y_i,t
        const yieldMultiplier = (this.soilHealth / 100) * lambdaWater * (1 + this.OMEGA * beeIndex) * (1 + this.ALPHA * Math.sqrt(chemicalBooster));
        const actualYield = item.plots * crop.base_yield * yieldMultiplier;

        seasonHarvestIncome += actualYield * crop.price_per_unit;
        seasonOxygen += item.plots * crop.oxygen_yield * (this.soilHealth / 100);

        if (crop.soil_impact > 0) {
          totalSoilRecovery += item.plots * crop.soil_impact;
        } else {
          totalSoilNutrientDrain += actualYield * Math.abs(crop.soil_impact / 20);
        }
      }
    });

    // Pendapatan panen rusak murah (Rp 1.000 / unit)
    const damagedIncome = damagedCropSold * 1000;
    this.totalMoney += seasonHarvestIncome + damagedIncome;

    // 3. Transisi Kesehatan Tanah H_t+1
    const humusBonus = this.BETA * damagedCropHumus;
    const chemicalDegradation = this.DELTA * Math.pow(chemicalBooster, 2);

    const nextSoilHealth = this.soilHealth 
      + totalSoilRecovery 
      + humusBonus 
      - totalSoilNutrientDrain 
      - chemicalDegradation;

    // Batas [0, 100]
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
