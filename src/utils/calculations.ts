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
  waist: number; // in cm
  neck: number; // in cm
  hip?: number; // in cm (required for female body fat)
  activityLevel: ActivityLevel;
}

export interface BodyMetrics {
  bmi: number;
  bmr: number;
  tdee: number;
  bodyFat: number;
  idealWeight: {
    kg: number;
    lb: number;
  };
  weightDiff: {
    kg: number;
    lb: number;
    type: 'lose' | 'gain' | 'maintain';
  };
}

export const calculateBMI = (weight: number, height: number): number => {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

export const calculateBMR = (data: BodyData): number => {
  const { weight, height, age, gender } = data;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

export const calculateTDEE = (bmr: number, activityLevel: ActivityLevel): number => {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  return bmr * multipliers[activityLevel];
};

export const calculateBodyFat = (data: BodyData): number => {
  const { gender, height, waist, neck, hip } = data;
  
  // Basic validation to prevent NaN or Infinity
  if (height <= 0 || waist <= 0 || neck <= 0) return 0;
  
  try {
    if (gender === 'male') {
      // US Navy Method for Men
      // log10(waist - neck) requires waist > neck
      const diff = waist - neck;
      if (diff <= 0) return 0;
      
      const logVal = Math.log10(diff);
      const result = 495 / (1.0324 - 0.19077 * logVal + 0.15456 * Math.log10(height)) - 450;
      return isFinite(result) ? Math.max(0, result) : 0;
    } else {
      // US Navy Method for Women (requires hip)
      if (!hip || hip <= 0) return 0;
      
      // log10(waist + hip - neck) requires waist + hip > neck
      const diff = waist + hip - neck;
      if (diff <= 0) return 0;
      
      const logVal = Math.log10(diff);
      const result = 495 / (1.29579 - 0.35004 * logVal + 0.22100 * Math.log10(height)) - 450;
      return isFinite(result) ? Math.max(0, result) : 0;
    }
  } catch (e) {
    return 0;
  }
};

export const calculateIdealWeight = (height: number, gender: Gender): { kg: number; lb: number } => {
  const heightInInches = height / 2.54;
  const baseWeight = gender === 'male' ? 50 : 45.5;
  const additionalHeight = Math.max(0, heightInInches - 60);
  const kg = baseWeight + 2.3 * additionalHeight;
  const lb = kg * 2.20462;
  return { kg, lb };
};

export const getIdealBodyFatRange = (gender: Gender, age: number): { min: number; max: number } => {
  if (gender === 'male') {
    if (age < 30) return { min: 8, max: 19 };
    if (age < 40) return { min: 11, max: 21 };
    if (age < 60) return { min: 13, max: 24 };
    return { min: 15, max: 26 };
  } else {
    if (age < 30) return { min: 21, max: 32 };
    if (age < 40) return { min: 23, max: 33 };
    if (age < 60) return { min: 24, max: 35 };
    return { min: 26, max: 37 };
  }
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};
