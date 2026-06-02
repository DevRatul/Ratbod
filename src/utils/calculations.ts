/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

export interface BodyData {
  gender: Gender;
  age: number;
  height: number; // in cm
  weight: number; // in kg
  waist: number; // in cm (optional or required for navy formula)
  neck: number; // in cm (optional or required for navy formula)
  hip: number; // in cm (for female)
  activityLevel: ActivityLevel;
}

export function calculateBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function calculateBMR(data: BodyData): number {
  const { gender, weight, height, age } = data;
  if (!weight || !height || !age) return 0;
  
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  return bmr * (multipliers[activityLevel] || 1.2);
}

export function calculateBodyFat(data: BodyData): number {
  const { gender, height, waist, neck, hip, weight, age } = data;
  const bmi = calculateBMI(weight, height);

  // US Navy Body Fat Formula (metric)
  try {
    if (gender === 'male' && waist && neck && height) {
      const logWaistNeck = Math.log10(waist - neck);
      const logHeight = Math.log10(height);
      if (waist > neck && !isNaN(logWaistNeck) && !isNaN(logHeight)) {
        // Navy formula for male
        const bodyFat = 495 / (1.0324 - (0.19077 * logWaistNeck) + (0.15456 * logHeight)) - 450;
        if (bodyFat > 2 && bodyFat < 60) return bodyFat;
      }
    } else if (gender === 'female' && waist && neck && hip && height) {
      const logWaistHipNeck = Math.log10(waist + hip - neck);
      const logHeight = Math.log10(height);
      if (waist + hip > neck && !isNaN(logWaistHipNeck) && !isNaN(logHeight)) {
        // Navy formula for female
        const bodyFat = 495 / (1.29579 - (0.35004 * logWaistHipNeck) + (0.22100 * logHeight)) - 450;
        if (bodyFat > 2 && bodyFat < 60) return bodyFat;
      }
    }
  } catch (e) {
    console.warn("Navy formula error, falling back to BMI: ", e);
  }

  // BMI-based body fat calculation (fallback)
  const genderFactor = gender === 'male' ? 1 : 0;
  const bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
  return Math.max(2, Math.min(60, bodyFat || 0));
}

export function calculateIdealWeight(height: number, gender: Gender): { kg: number; lb: number } {
  if (!height) return { kg: 0, lb: 0 };
  
  // Devine formula
  const inchesOver5Feet = Math.max(0, (height / 2.54) - 60);
  const baseWeight = gender === 'male' ? 50.0 : 45.5;
  const kg = baseWeight + (2.3 * inchesOver5Feet);
  const lb = kg * 2.20462;
  return { kg, lb };
}

export function getIdealBodyFatRange(gender: Gender, age: number): { min: number; max: number } {
  if (gender === 'male') {
    if (age < 30) return { min: 8, max: 19 };
    if (age <= 50) return { min: 11, max: 22 };
    return { min: 13, max: 25 };
  } else {
    if (age < 30) return { min: 21, max: 32 };
    if (age <= 50) return { min: 23, max: 34 };
    return { min: 26, max: 37 };
  }
}
