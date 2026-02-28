/**
 * Statistics Service
 * Provides statistical calculations for Design of Experiments (DoE)
 * Includes descriptive stats, hypothesis testing, effect sizes, and power analysis
 */

export interface DescriptiveStats {
  mean: number;
  median: number;
  mode: number | null;
  standardDeviation: number;
  variance: number;
  sampleSize: number;
  min: number;
  max: number;
  range: number;
  standardError: number;
  confidenceInterval: { lower: number; upper: number };
}

export interface HypothesisTestResult {
  testType: string;
  statistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  significant: boolean;
  effectSize?: number;
  interpretation: string;
  confidenceLevel: number;
}

export interface PowerAnalysisResult {
  requiredSampleSize: number;
  achievedPower: number;
  effectSize: number;
  alpha: number;
}

// Helper: Calculate mean
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Helper: Calculate median
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper: Calculate mode
function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  let maxCount = 0;
  let modeValue: number | null = null;

  for (const v of values) {
    const count = (counts.get(v) || 0) + 1;
    counts.set(v, count);
    if (count > maxCount) {
      maxCount = count;
      modeValue = v;
    }
  }

  return maxCount > 1 ? modeValue : null;
}

// Helper: Calculate variance
function variance(values: number[], isSample: boolean = true): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - m, 2));
  const divisor = isSample ? values.length - 1 : values.length;
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / divisor;
}

// Helper: Calculate standard deviation
function standardDeviation(values: number[], isSample: boolean = true): number {
  return Math.sqrt(variance(values, isSample));
}

// Helper: Standard error of the mean
function standardError(values: number[]): number {
  if (values.length === 0) return 0;
  return standardDeviation(values) / Math.sqrt(values.length);
}

// Helper: t-distribution critical value approximation (two-tailed)
function tCritical(df: number, alpha: number = 0.05): number {
  // Approximation using Abramowitz and Stegun formula
  const a = alpha / 2;
  const z = Math.sqrt(2) * inverseErf(1 - 2 * a);

  // Adjust for degrees of freedom
  if (df >= 120) return z;

  const g1 = (z * z * z + z) / 4;
  const g2 = ((5 * Math.pow(z, 5)) + (16 * Math.pow(z, 3)) + (3 * z)) / 96;
  const g3 = ((3 * Math.pow(z, 7)) + (19 * Math.pow(z, 5)) + (17 * Math.pow(z, 3)) - (15 * z)) / 384;

  return z + g1 / df + g2 / (df * df) + g3 / (df * df * df);
}

// Helper: Inverse error function approximation
function inverseErf(x: number): number {
  const a = 0.147;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const ln = Math.log(1 - x * x);
  const part1 = 2 / (Math.PI * a) + ln / 2;
  const part2 = ln / a;

  return sign * Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1);
}

// Helper: Error function approximation
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Helper: Calculate p-value from t-statistic (two-tailed)
function tDistributionPValue(t: number, df: number): number {
  // Approximation using incomplete beta function
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);
}

// Helper: Incomplete beta function approximation
function incompleteBeta(a: number, b: number, x: number): number {
  // Simple approximation for our use case
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use continued fraction expansion
  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCf(a, b, x)) / a;
  } else {
    return 1 - (bt * betaCf(b, a, 1 - x)) / b;
  }
}

// Helper: Log gamma function
function lgamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Helper: Beta continued fraction
function betaCf(a: number, b: number, x: number): number {
  const maxIter = 100;
  const eps = 3e-7;
  const fpmin = 1e-30;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}

// Helper: F-distribution p-value
function fDistributionPValue(f: number, df1: number, df2: number): number {
  const x = df2 / (df2 + df1 * f);
  return incompleteBeta(df2 / 2, df1 / 2, x);
}

export class StatisticsService {
  /**
   * Calculate comprehensive descriptive statistics
   */
  calculateDescriptiveStats(values: number[], alpha: number = 0.05): DescriptiveStats {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        mode: null,
        standardDeviation: 0,
        variance: 0,
        sampleSize: 0,
        min: 0,
        max: 0,
        range: 0,
        standardError: 0,
        confidenceInterval: { lower: 0, upper: 0 },
      };
    }

    const m = mean(values);
    const se = standardError(values);
    const df = values.length - 1;
    const tCrit = tCritical(df, alpha);
    const marginOfError = tCrit * se;

    return {
      mean: m,
      median: median(values),
      mode: mode(values),
      standardDeviation: standardDeviation(values),
      variance: variance(values),
      sampleSize: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      standardError: se,
      confidenceInterval: {
        lower: m - marginOfError,
        upper: m + marginOfError,
      },
    };
  }

  /**
   * Two-sample t-test (independent samples)
   */
  tTestTwoSample(
    group1: number[],
    group2: number[],
    alpha: number = 0.05
  ): HypothesisTestResult {
    const n1 = group1.length;
    const n2 = group2.length;
    const m1 = mean(group1);
    const m2 = mean(group2);
    const v1 = variance(group1);
    const v2 = variance(group2);

    // Welch's t-test (doesn't assume equal variances)
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    const t = (m1 - m2) / se;

    // Welch-Satterthwaite degrees of freedom
    const df = Math.pow(v1 / n1 + v2 / n2, 2) / (
      Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1)
    );

    const pValue = tDistributionPValue(Math.abs(t), df);
    const significant = pValue < alpha;
    const effectSize = this.cohensD(group1, group2);

    let interpretation: string;
    if (significant) {
      if (m1 > m2) {
        interpretation = `Group 1 (M=${m1.toFixed(2)}) is significantly higher than Group 2 (M=${m2.toFixed(2)}), t(${df.toFixed(1)})=${t.toFixed(3)}, p=${pValue.toFixed(4)}, d=${effectSize.toFixed(2)}`;
      } else {
        interpretation = `Group 2 (M=${m2.toFixed(2)}) is significantly higher than Group 1 (M=${m1.toFixed(2)}), t(${df.toFixed(1)})=${t.toFixed(3)}, p=${pValue.toFixed(4)}, d=${effectSize.toFixed(2)}`;
      }
    } else {
      interpretation = `No significant difference between groups, t(${df.toFixed(1)})=${t.toFixed(3)}, p=${pValue.toFixed(4)}`;
    }

    return {
      testType: 'Two-Sample t-Test (Welch)',
      statistic: t,
      pValue,
      degreesOfFreedom: df,
      significant,
      effectSize,
      interpretation,
      confidenceLevel: 1 - alpha,
    };
  }

  /**
   * Paired t-test (dependent samples)
   */
  tTestPaired(
    before: number[],
    after: number[],
    alpha: number = 0.05
  ): HypothesisTestResult {
    if (before.length !== after.length) {
      throw new Error('Paired samples must have equal length');
    }

    const differences = before.map((b, i) => after[i] - b);
    const n = differences.length;
    const m = mean(differences);
    const se = standardError(differences);
    const t = m / se;
    const df = n - 1;

    const pValue = tDistributionPValue(Math.abs(t), df);
    const significant = pValue < alpha;
    const effectSize = m / standardDeviation(differences);

    let interpretation: string;
    if (significant) {
      const direction = m > 0 ? 'increase' : 'decrease';
      interpretation = `Significant ${direction} from before to after, mean difference=${m.toFixed(2)}, t(${df})=${t.toFixed(3)}, p=${pValue.toFixed(4)}, d=${effectSize.toFixed(2)}`;
    } else {
      interpretation = `No significant change from before to after, t(${df})=${t.toFixed(3)}, p=${pValue.toFixed(4)}`;
    }

    return {
      testType: 'Paired t-Test',
      statistic: t,
      pValue,
      degreesOfFreedom: df,
      significant,
      effectSize: Math.abs(effectSize),
      interpretation,
      confidenceLevel: 1 - alpha,
    };
  }

  /**
   * One-way ANOVA
   */
  oneWayAnova(groups: number[][], alpha: number = 0.05): HypothesisTestResult {
    const k = groups.length; // number of groups
    const allValues = groups.flat();
    const N = allValues.length; // total sample size
    const grandMean = mean(allValues);

    // Between-group sum of squares (SSB)
    let ssb = 0;
    for (const group of groups) {
      const groupMean = mean(group);
      ssb += group.length * Math.pow(groupMean - grandMean, 2);
    }

    // Within-group sum of squares (SSW)
    let ssw = 0;
    for (const group of groups) {
      const groupMean = mean(group);
      for (const value of group) {
        ssw += Math.pow(value - groupMean, 2);
      }
    }

    const dfBetween = k - 1;
    const dfWithin = N - k;

    const msBetween = ssb / dfBetween;
    const msWithin = ssw / dfWithin;

    const f = msBetween / msWithin;
    const pValue = fDistributionPValue(f, dfBetween, dfWithin);
    const significant = pValue < alpha;

    // Eta-squared effect size
    const etaSquared = ssb / (ssb + ssw);

    let interpretation: string;
    if (significant) {
      interpretation = `Significant difference between groups, F(${dfBetween}, ${dfWithin})=${f.toFixed(3)}, p=${pValue.toFixed(4)}, η²=${etaSquared.toFixed(3)}`;
    } else {
      interpretation = `No significant difference between groups, F(${dfBetween}, ${dfWithin})=${f.toFixed(3)}, p=${pValue.toFixed(4)}`;
    }

    return {
      testType: 'One-Way ANOVA',
      statistic: f,
      pValue,
      degreesOfFreedom: dfBetween,
      significant,
      effectSize: etaSquared,
      interpretation,
      confidenceLevel: 1 - alpha,
    };
  }

  /**
   * Cohen's d effect size (standardized mean difference)
   */
  cohensD(group1: number[], group2: number[]): number {
    const m1 = mean(group1);
    const m2 = mean(group2);
    const n1 = group1.length;
    const n2 = group2.length;
    const v1 = variance(group1);
    const v2 = variance(group2);

    // Pooled standard deviation
    const pooledSD = Math.sqrt(
      ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
    );

    return (m1 - m2) / pooledSD;
  }

  /**
   * Interpret Cohen's d effect size
   */
  interpretEffectSize(d: number): string {
    const absD = Math.abs(d);
    if (absD < 0.2) return 'negligible';
    if (absD < 0.5) return 'small';
    if (absD < 0.8) return 'medium';
    return 'large';
  }

  /**
   * Calculate required sample size for desired power
   */
  calculateRequiredSampleSize(
    effectSize: number,
    power: number = 0.8,
    alpha: number = 0.05
  ): number {
    // For two-sample t-test
    // n = 2 * ((z_alpha + z_beta) / d)^2

    const zAlpha = Math.sqrt(2) * inverseErf(1 - alpha);
    const zBeta = Math.sqrt(2) * inverseErf(2 * power - 1);

    const n = 2 * Math.pow((zAlpha + zBeta) / effectSize, 2);

    return Math.ceil(n);
  }

  /**
   * Calculate achieved statistical power
   */
  calculatePower(
    sampleSize: number,
    effectSize: number,
    alpha: number = 0.05
  ): number {
    const zAlpha = Math.sqrt(2) * inverseErf(1 - alpha);
    const ncp = effectSize * Math.sqrt(sampleSize / 2);
    const zBeta = ncp - zAlpha;
    const power = 0.5 * (1 + erf(zBeta / Math.sqrt(2)));

    return Math.max(0, Math.min(1, power));
  }

  /**
   * Full power analysis
   */
  powerAnalysis(
    group1: number[],
    group2: number[],
    alpha: number = 0.05,
    desiredPower: number = 0.8
  ): PowerAnalysisResult {
    const effectSize = Math.abs(this.cohensD(group1, group2));
    const currentSampleSize = Math.min(group1.length, group2.length);
    const achievedPower = this.calculatePower(currentSampleSize, effectSize, alpha);
    const requiredSampleSize = this.calculateRequiredSampleSize(effectSize, desiredPower, alpha);

    return {
      requiredSampleSize,
      achievedPower,
      effectSize,
      alpha,
    };
  }

  /**
   * Multiple comparison correction (Bonferroni)
   */
  bonferroniCorrection(pValues: number[], alpha: number = 0.05): {
    adjustedPValues: number[];
    significantIndices: number[];
    adjustedAlpha: number;
  } {
    const n = pValues.length;
    const adjustedAlpha = alpha / n;
    const adjustedPValues = pValues.map((p) => Math.min(p * n, 1));
    const significantIndices = adjustedPValues
      .map((p, i) => (p < alpha ? i : -1))
      .filter((i) => i >= 0);

    return {
      adjustedPValues,
      significantIndices,
      adjustedAlpha,
    };
  }

  /**
   * Generate factorial design combinations
   */
  generateFactorialCombinations(
    factors: Array<{ name: string; levels: string[] }>
  ): Array<Record<string, string>> {
    if (factors.length === 0) return [{}];

    const combinations: Array<Record<string, string>> = [];

    const generate = (index: number, current: Record<string, string>) => {
      if (index === factors.length) {
        combinations.push({ ...current });
        return;
      }

      const factor = factors[index];
      for (const level of factor.levels) {
        current[factor.name] = level;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }
}

export const statisticsService = new StatisticsService();
