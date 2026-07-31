// AGENT 2: Cloud Traffic & Financial Cost Simulator Engine
import { CLOUD_PROVIDERS } from '../data/cloudPricingData.js';

export class SimulatorAgent {
  constructor() {
    this.name = "Agent 2 (The Simulator)";
  }

  simulateCosts({
    monthlyActiveUsers = 100000,
    requestsPerSecondPeak = 200,
    databaseSizeGB = 500,
    monthlyEgressTB = 2.0,
    currentMonthlySpend = 3500
  }) {
    const logs = [];
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] [Agent 2: Simulator] Starting stress-test simulation: MAU=${monthlyActiveUsers.toLocaleString()}, DB=${databaseSizeGB}GB, Egress=${monthlyEgressTB}TB, Peak RPS=${requestsPerSecondPeak}...`);

    const hoursInMonth = 720;
    const monthlyEgressGB = monthlyEgressTB * 1024;

    const results = {};
    let recommendedProvider = null;
    let lowestCost = Infinity;

    Object.keys(CLOUD_PROVIDERS).forEach(providerKey => {
      const provider = CLOUD_PROVIDERS[providerKey];
      
      // Determine required compute nodes based on peak RPS
      const nodeCount = Math.max(1, Math.ceil(requestsPerSecondPeak / 250));
      const sampleCompute = Object.values(provider.compute)[0];
      const computeMonthly = nodeCount * sampleCompute.hourlyRate * hoursInMonth;

      // Database cost
      const sampleDb = Object.values(provider.database)[0];
      const dbMonthly = sampleDb.monthlyRate || (sampleDb.hourlyRate * hoursInMonth);

      // Storage cost
      const storageMonthly = databaseSizeGB * provider.storageGB;

      // Egress network cost
      const egressMonthly = monthlyEgressGB * provider.egressGB;

      // Total On-Demand Monthly Cost
      const totalOnDemand = computeMonthly + dbMonthly + storageMonthly + egressMonthly;

      // Discounted 1-Year Reserved Instance / Commitment Cost
      const reservedDiscount = provider.reservedDiscountYear1 || 0.35;
      const totalReserved = totalOnDemand * (1 - reservedDiscount);

      const annualSavingsVsCurrent = ((currentMonthlySpend * 12) - (totalReserved * 12));

      results[providerKey] = {
        providerName: provider.name,
        badgeColor: provider.badgeColor,
        nodeCount,
        breakdown: {
          compute: Math.round(computeMonthly),
          database: Math.round(dbMonthly),
          storage: Math.round(storageMonthly),
          egress: Math.round(egressMonthly)
        },
        monthlyOnDemand: Math.round(totalOnDemand),
        monthlyReserved: Math.round(totalReserved),
        annualSpend: Math.round(totalReserved * 12),
        slaUptime: provider.slaUptime,
        annualSavingsVsCurrent: Math.round(annualSavingsVsCurrent)
      };

      if (totalReserved < lowestCost) {
        lowestCost = totalReserved;
        recommendedProvider = providerKey;
      }
    });

    logs.push(`[${new Date().toISOString()}] [Agent 2: Simulator] Cost simulation matrix calculated.`);
    logs.push(`[${new Date().toISOString()}] [Agent 2: Simulator] OPTIMAL ARCHITECTURE: ${CLOUD_PROVIDERS[recommendedProvider].name} @ $${Math.round(lowestCost).toLocaleString()}/mo ($${results[recommendedProvider].annualSavingsVsCurrent > 0 ? Math.round(results[recommendedProvider].annualSavingsVsCurrent).toLocaleString() : 0} annual savings)`);

    return {
      success: true,
      parameters: { monthlyActiveUsers, requestsPerSecondPeak, databaseSizeGB, monthlyEgressTB, currentMonthlySpend },
      results,
      recommendedProvider: results[recommendedProvider],
      logs
    };
  }
}
