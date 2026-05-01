import { SCENARIOS } from '../data/scenarios';
import type { ScenarioProfile } from '../data/scenarios';

export function buildScenarioList(totalPerTenant: number): ScenarioProfile[] {
  const scenarioList: ScenarioProfile[] = [];
  const totalDefined = SCENARIOS.reduce((sum, s) => sum + s.count, 0);
  const scaleFactor = totalPerTenant / totalDefined;

  for (const scenario of SCENARIOS) {
    const count = Math.max(1, Math.round(scenario.count * scaleFactor));
    for (let i = 0; i < count; i++) {
      scenarioList.push(scenario);
    }
  }

  // Shuffle for randomness
  for (let i = scenarioList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = scenarioList[i];
    if (temp !== undefined && scenarioList[j] !== undefined) {
      scenarioList[i] = scenarioList[j] as ScenarioProfile;
      scenarioList[j] = temp;
    }
  }

  return scenarioList.slice(0, totalPerTenant);
}
