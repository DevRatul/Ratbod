/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Bed, AlarmClock, Moon, Sparkles } from 'lucide-react';

interface CircularSleepDialProps {
  bedTime: string; // "HH:MM" (24h storage format)
  wakeTime: string; // "HH:MM" (24h storage format)
  onChange: (bedTime: string, wakeTime: string) => void;
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
  formatNum?: (val: number | string) => string;
}

// Convert "HH:MM" to minutes from midnight [0, 1440)
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return ((h * 60 + m) % 1440 + 1440) % 1440;
}

// Convert minutes from midnight [0, 1440) to "HH:MM"
function minutesToTime(totalMin: number): string {
  const norm = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Convert 24-hour time to angle on a 12-hour clock face
// 12 hours = 720 minutes = 360 degrees. 1 minute = 0.5 degrees.
// Angle 0° is 12 o'clock (Top), 90° is 3 o'clock, 180° is 6 o'clock, 270° is 9 o'clock.
function timeTo12HourAngle(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  const h12 = (h || 0) % 12; // 0..11
  const min12 = h12 * 60 + (m || 0); // 0..719
  return (min12 / 720) * 360;
}

export default function CircularSleepDial({
  bedTime,
  wakeTime,
  onChange,
  darkMode,
  lang = 'en',
  formatNum = (v) => String(v),
}: CircularSleepDialProps) {
  const isBn = lang === 'bn';
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Interaction dragging state
  const [dragTarget, setDragTarget] = useState<'bed' | 'wake' | 'arc' | null>(null);

  // Ref tracking smooth relative rotational movement
  const dragStateRef = useRef<{
    lastAngle: number;
    currentBedMinutes: number;
    currentWakeMinutes: number;
    durationMinutes: number;
    minuteAccumulator: number;
  }>({
    lastAngle: 0,
    currentBedMinutes: 0,
    currentWakeMinutes: 0,
    durationMinutes: 0,
    minuteAccumulator: 0,
  });

  // Center and Dimensions for 320x320 SVG
  const cx = 160;
  const cy = 160;
  const trackRadius = 114;
  const trackStrokeWidth = 32;
  const handleRadius = 18;

  const bedMinutes = useMemo(() => timeToMinutes(bedTime), [bedTime]);
  const wakeMinutes = useMemo(() => timeToMinutes(wakeTime), [wakeTime]);

  // Total duration in minutes (in 24-hour cycle)
  const durationMinutes = useMemo(() => {
    let diff = wakeMinutes - bedMinutes;
    if (diff <= 0) diff += 1440;
    return diff;
  }, [bedMinutes, wakeMinutes]);

  // 12-Hour Clock Angles measured clockwise from Top (12 o'clock is angle 0°)
  const bedAngle = useMemo(() => timeTo12HourAngle(bedTime), [bedTime]);
  const wakeAngle = useMemo(() => timeTo12HourAngle(wakeTime), [wakeTime]);

  // Clockwise sweep angle from bed to wake on the 12-hour clock
  // E.g., from 8 o'clock (240°) to 3 o'clock (90°) = (90 - 240 + 360) % 360 = 210° (7 hours)
  const sweepAngle = useMemo(() => {
    let sweep = (wakeAngle - bedAngle + 360) % 360;
    if (sweep === 0) sweep = 360;
    return sweep;
  }, [bedAngle, wakeAngle]);

  // Convert clockwise angle from Top to SVG coordinate (x, y)
  // Angle 0° (12 o'clock) is at (cx, cy - radius)
  const getCoordinates = useCallback((angleDeg: number, radius: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }, [cx, cy]);

  const bedPos = useMemo(() => getCoordinates(bedAngle, trackRadius), [bedAngle, trackRadius, getCoordinates]);
  const wakePos = useMemo(() => getCoordinates(wakeAngle, trackRadius), [wakeAngle, trackRadius, getCoordinates]);

  // SVG Arc Path: M start A rx ry 0 largeArc sweep end
  const arcPath = useMemo(() => {
    const largeArc = sweepAngle > 180 ? 1 : 0;
    return `M ${bedPos.x} ${bedPos.y} A ${trackRadius} ${trackRadius} 0 ${largeArc} 1 ${wakePos.x} ${wakePos.y}`;
  }, [bedPos, wakePos, trackRadius, sweepAngle]);

  // Radial Ribs / Striations inside the active sleep arc
  // Generates radial lines along the arc matching the Apple Bedtime gauge aesthetic
  const arcRibs = useMemo(() => {
    const ribs: { x1: number; y1: number; x2: number; y2: number; key: number }[] = [];
    const step = 3; // every 3 degrees (6 minutes on 12-hour clock)
    const margin = 7; // avoid colliding with handle circles
    if (sweepAngle <= margin * 2) return ribs;

    const innerR = trackRadius - 10;
    const outerR = trackRadius + 10;

    for (let offset = margin; offset <= sweepAngle - margin; offset += step) {
      const angle = (bedAngle + offset) % 360;
      const p1 = getCoordinates(angle, innerR);
      const p2 = getCoordinates(angle, outerR);
      ribs.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        key: offset,
      });
    }
    return ribs;
  }, [bedAngle, sweepAngle, trackRadius, getCoordinates]);

  // Convert pointer event to angle clockwise from Top (0..360°)
  const getAngleFromEvent = useCallback((e: React.PointerEvent<any>): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 320 / rect.width;
    const scaleY = 320 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const dx = px - cx;
    const dy = py - cy;
    const rad = Math.atan2(dy, dx);
    const deg = rad * (180 / Math.PI);
    return ((deg + 90) % 360 + 360) % 360;
  }, [cx, cy]);

  // Pointer Handlers for Round-and-Round 12-Hour Dial Dragging
  const handlePointerDown = (
    e: React.PointerEvent<any>, 
    target: 'bed' | 'wake' | 'arc' | 'track'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const currentAngle = getAngleFromEvent(e);
    let resolvedTarget: 'bed' | 'wake' | 'arc' = 'arc';

    if (target === 'track') {
      // If clicked on the circular track, pick whichever handle is angularly closer
      const distToBed = Math.min(
        Math.abs(currentAngle - bedAngle),
        360 - Math.abs(currentAngle - bedAngle)
      );
      const distToWake = Math.min(
        Math.abs(currentAngle - wakeAngle),
        360 - Math.abs(currentAngle - wakeAngle)
      );
      resolvedTarget = distToBed < distToWake ? 'bed' : 'wake';
    } else {
      resolvedTarget = target;
    }

    setDragTarget(resolvedTarget);
    dragStateRef.current = {
      lastAngle: currentAngle,
      currentBedMinutes: bedMinutes,
      currentWakeMinutes: wakeMinutes,
      durationMinutes: durationMinutes,
      minuteAccumulator: 0,
    };

    if (svgRef.current) {
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragTarget) return;
    e.preventDefault();
    e.stopPropagation();

    const currentAngle = getAngleFromEvent(e);
    let deltaAngle = currentAngle - dragStateRef.current.lastAngle;
    
    // Normalize angular difference across the 0° (12 o'clock) boundary
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    dragStateRef.current.lastAngle = currentAngle;

    // In a 12-hour clock: 360 degrees = 720 minutes => 1 degree = 2 minutes
    dragStateRef.current.minuteAccumulator += deltaAngle * 2;

    // Snap adjustment in 5-minute increments for precise, clean control
    const step = Math.trunc(dragStateRef.current.minuteAccumulator / 5) * 5;
    if (step !== 0) {
      dragStateRef.current.minuteAccumulator -= step;

      if (dragTarget === 'bed') {
        const nextBed = ((dragStateRef.current.currentBedMinutes + step) % 1440 + 1440) % 1440;
        dragStateRef.current.currentBedMinutes = nextBed;
        onChange(minutesToTime(nextBed), minutesToTime(dragStateRef.current.currentWakeMinutes));
      } else if (dragTarget === 'wake') {
        const nextWake = ((dragStateRef.current.currentWakeMinutes + step) % 1440 + 1440) % 1440;
        dragStateRef.current.currentWakeMinutes = nextWake;
        onChange(minutesToTime(dragStateRef.current.currentBedMinutes), minutesToTime(nextWake));
      } else if (dragTarget === 'arc') {
        const nextBed = ((dragStateRef.current.currentBedMinutes + step) % 1440 + 1440) % 1440;
        const nextWake = ((nextBed + dragStateRef.current.durationMinutes) % 1440 + 1440) % 1440;
        dragStateRef.current.currentBedMinutes = nextBed;
        dragStateRef.current.currentWakeMinutes = nextWake;
        onChange(minutesToTime(nextBed), minutesToTime(nextWake));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragTarget && svgRef.current) {
      try {
        svgRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    setDragTarget(null);
  };

  // 12-Hour Clock Numbers: 12 at top (0°), 1, 2, 3 (90°), 4, 5, 6 (180°), 7, 8, 9 (270°), 10, 11
  const clockNumbers = useMemo(() => {
    const list = [
      { text: '12', hour: 12, isCardinal: true },
      { text: '1', hour: 1 },
      { text: '2', hour: 2 },
      { text: '3', hour: 3, isCardinal: true },
      { text: '4', hour: 4 },
      { text: '5', hour: 5 },
      { text: '6', hour: 6, isCardinal: true },
      { text: '7', hour: 7 },
      { text: '8', hour: 8 },
      { text: '9', hour: 9, isCardinal: true },
      { text: '10', hour: 10 },
      { text: '11', hour: 11 },
    ];

    const bnMap: Record<string, string> = {
      '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫',
      '6': '৬', '7': '৭', '8': '৮', '9': '৯', '10': '১০',
      '11': '১১', '12': '১২'
    };

    return list.map((item) => {
      // 12 is at angle 0° (top), 1 is at 30°, etc.
      const angle = (item.hour % 12) * 30;
      const pos = getCoordinates(angle, 73);
      // 10:00 PM to 2:00 AM Prime Sleep Window (hours 10, 11, 12, 1, 2)
      const isPrimeHour = item.hour === 10 || item.hour === 11 || item.hour === 12 || item.hour === 1 || item.hour === 2;
      return {
        ...item,
        x: pos.x,
        y: pos.y,
        isPrimeHour,
        display: isBn ? (bnMap[item.text] || formatNum(item.text)) : item.text,
      };
    });
  }, [getCoordinates, isBn, formatNum]);

  // Perimeter Tick Marks for 12-Hour Clock
  // 12 major hour ticks, 12 half-hour ticks, and quarter-hour sub-ticks
  const clockTicks = useMemo(() => {
    const ticks: { x1: number; y1: number; x2: number; y2: number; type: 'hour' | 'half' | 'quarter'; isPrimeZone: boolean }[] = [];

    for (let h = 0; h < 12; h++) {
      const baseAngle = h * 30;
      // Prime 10 PM - 2 AM window spans 300° to 60°
      const isPrimeZone = baseAngle >= 300 || baseAngle <= 60;

      // Hour tick (prominent)
      const p1 = getCoordinates(baseAngle, 89);
      const p2 = getCoordinates(baseAngle, 96);
      ticks.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, type: 'hour', isPrimeZone });

      // Quarter-hour tick (:15)
      const q1Angle = baseAngle + 7.5;
      const isQ1Prime = q1Angle >= 300 || q1Angle <= 60;
      const q1p1 = getCoordinates(q1Angle, 93);
      const q1p2 = getCoordinates(q1Angle, 96);
      ticks.push({ x1: q1p1.x, y1: q1p1.y, x2: q1p2.x, y2: q1p2.y, type: 'quarter', isPrimeZone: isQ1Prime });

      // Half-hour tick (:30)
      const hAngle = baseAngle + 15;
      const isHPrime = hAngle >= 300 || hAngle <= 60;
      const hp1 = getCoordinates(hAngle, 91);
      const hp2 = getCoordinates(hAngle, 96);
      ticks.push({ x1: hp1.x, y1: hp1.y, x2: hp2.x, y2: hp2.y, type: 'half', isPrimeZone: isHPrime });

      // Three-quarter-hour tick (:45)
      const q2Angle = baseAngle + 22.5;
      const isQ2Prime = q2Angle >= 300 || q2Angle <= 60;
      const q2p1 = getCoordinates(q2Angle, 93);
      const q2p2 = getCoordinates(q2Angle, 96);
      ticks.push({ x1: q2p1.x, y1: q2p1.y, x2: q2p2.x, y2: q2p2.y, type: 'quarter', isPrimeZone: isQ2Prime });
    }

    return ticks;
  }, [getCoordinates]);

  // 10:00 PM to 2:00 AM Prime Sleep Window Paths (300° to 60° = 120° sector)
  const primeZonePaths = useMemo(() => {
    // Outer track boundary arc (r = 130.5)
    const outerStart = getCoordinates(300, 130.5);
    const outerEnd = getCoordinates(60, 130.5);
    const outerArc = `M ${outerStart.x} ${outerStart.y} A 130.5 130.5 0 0 1 ${outerEnd.x} ${outerEnd.y}`;

    // Inner track boundary arc (r = 97.5)
    const innerStart = getCoordinates(300, 97.5);
    const innerEnd = getCoordinates(60, 97.5);
    const innerArc = `M ${innerStart.x} ${innerStart.y} A 97.5 97.5 0 0 1 ${innerEnd.x} ${innerEnd.y}`;

    // Guide track band (r = 114)
    const bandStart = getCoordinates(300, 114);
    const bandEnd = getCoordinates(60, 114);
    const bandArc = `M ${bandStart.x} ${bandStart.y} A 114 114 0 0 1 ${bandEnd.x} ${bandEnd.y}`;

    // Boundary tick markers at 10:00 (300°) and 2:00 (60°)
    const p10_inner = getCoordinates(300, 96);
    const p10_outer = getCoordinates(300, 132);
    const p2_inner = getCoordinates(60, 96);
    const p2_outer = getCoordinates(60, 132);

    return {
      outerArc,
      innerArc,
      bandArc,
      p10_inner,
      p10_outer,
      p2_inner,
      p2_outer,
    };
  }, [getCoordinates]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 320 320"
        className="w-[270px] h-[270px] xs:w-[285px] xs:h-[285px] sm:w-[310px] sm:h-[310px] touch-none cursor-pointer"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <defs>
          {/* Outer Drop Shadow */}
          <filter id="dial-shadow-12" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow 
              dx="0" 
              dy="3" 
              stdDeviation="5" 
              floodColor={darkMode ? "#000000" : "#0f172a"} 
              floodOpacity={darkMode ? "0.45" : "0.10"} 
            />
          </filter>
          {/* Knob handle shadow */}
          <filter id="handle-shadow-12" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow 
              dx="0" 
              dy="2" 
              stdDeviation="3" 
              floodColor={darkMode ? "#000000" : "#0f172a"} 
              floodOpacity={darkMode ? "0.55" : "0.18"} 
            />
          </filter>
        </defs>

        {/* 1. Outer Bezel / Base Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={144}
          fill={darkMode ? "#0d0e12" : "#f1f5f9"}
          filter="url(#dial-shadow-12)"
        />

        {/* 2. Track Background Ring (Dark Slate in Dark Mode, Soft Slate in Light Mode) */}
        <circle
          cx={cx}
          cy={cy}
          r={trackRadius}
          fill="none"
          stroke={darkMode ? "#181a20" : "#e2e8f0"}
          strokeWidth={trackStrokeWidth}
          className="cursor-pointer"
          onPointerDown={(e) => handlePointerDown(e, 'track')}
        />

        {/* 2a. Prime Sleep Window (10:00 PM to 2:00 AM) Subtle Track Guide */}
        <path
          d={primeZonePaths.bandArc}
          fill="none"
          stroke={darkMode ? "#10b981" : "#059669"}
          strokeWidth={trackStrokeWidth - 2}
          strokeOpacity={darkMode ? "0.08" : "0.06"}
          pointerEvents="none"
        />

        {/* Subtle Track Borders */}
        <circle
          cx={cx}
          cy={cy}
          r={trackRadius - trackStrokeWidth / 2}
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={trackRadius + trackStrokeWidth / 2}
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
          strokeWidth="1"
        />

        {/* 2b. Prime Sleep Window (10 PM to 2 AM) Green Boundary Rails */}
        <path
          d={primeZonePaths.outerArc}
          fill="none"
          stroke={darkMode ? "rgba(16, 185, 129, 0.45)" : "rgba(5, 150, 105, 0.40)"}
          strokeWidth="1.8"
          strokeLinecap="round"
          pointerEvents="none"
        />
        <path
          d={primeZonePaths.innerArc}
          fill="none"
          stroke={darkMode ? "rgba(16, 185, 129, 0.35)" : "rgba(5, 150, 105, 0.30)"}
          strokeWidth="1.4"
          strokeLinecap="round"
          pointerEvents="none"
        />

        {/* 10:00 and 2:00 Boundary Radial Divider Lines */}
        <line
          x1={primeZonePaths.p10_inner.x}
          y1={primeZonePaths.p10_inner.y}
          x2={primeZonePaths.p10_outer.x}
          y2={primeZonePaths.p10_outer.y}
          stroke={darkMode ? "#10b981" : "#059669"}
          strokeWidth="1.8"
          strokeLinecap="round"
          pointerEvents="none"
        />
        <line
          x1={primeZonePaths.p2_inner.x}
          y1={primeZonePaths.p2_inner.y}
          x2={primeZonePaths.p2_outer.x}
          y2={primeZonePaths.p2_outer.y}
          stroke={darkMode ? "#10b981" : "#059669"}
          strokeWidth="1.8"
          strokeLinecap="round"
          pointerEvents="none"
        />

        {/* 3. Active Sleep Arc Band (The Draggable Sleep Interval on 12-Hour Scale) */}
        <path
          d={arcPath}
          fill="none"
          stroke={darkMode ? "#363a45" : "#475569"}
          strokeWidth={trackStrokeWidth - 1}
          strokeLinecap="round"
          className="cursor-grab active:cursor-grabbing transition-colors duration-150"
          onPointerDown={(e) => handlePointerDown(e, 'arc')}
        />

        {/* 4. Radial Tick Ribs / Striations along active arc */}
        <g pointerEvents="none">
          {arcRibs.map((rib) => (
            <line
              key={rib.key}
              x1={rib.x1}
              y1={rib.y1}
              x2={rib.x2}
              y2={rib.y2}
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* 5. Inner Dial Face (Center Disc with 12-hour numbers & ticks) */}
        <circle
          cx={cx}
          cy={cy}
          r={96}
          fill={darkMode ? "#23262d" : "#ffffff"}
          stroke={darkMode ? "none" : "#e2e8f0"}
          strokeWidth={darkMode ? "0" : "1"}
          className="pointer-events-none"
        />

        {/* 6. Tick marks on Inner Perimeter of 12-Hour Clock (Greenish in 10 PM - 2 AM Prime Zone) */}
        <g pointerEvents="none">
          {clockTicks.map((t, idx) => {
            let tickStroke = "";
            if (t.isPrimeZone) {
              if (t.type === 'hour') {
                tickStroke = darkMode ? "#10b981" : "#059669";
              } else if (t.type === 'half') {
                tickStroke = darkMode ? "rgba(16, 185, 129, 0.55)" : "rgba(5, 150, 105, 0.45)";
              } else {
                tickStroke = darkMode ? "rgba(16, 185, 129, 0.28)" : "rgba(5, 150, 105, 0.22)";
              }
            } else {
              if (darkMode) {
                tickStroke = t.type === 'hour' 
                  ? "rgba(255,255,255,0.45)" 
                  : t.type === 'half' 
                  ? "rgba(255,255,255,0.25)" 
                  : "rgba(255,255,255,0.12)";
              } else {
                tickStroke = t.type === 'hour' 
                  ? "rgba(15,23,42,0.65)" 
                  : t.type === 'half' 
                  ? "rgba(15,23,42,0.30)" 
                  : "rgba(15,23,42,0.15)";
              }
            }
            return (
              <line
                key={idx}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={tickStroke}
                strokeWidth={t.isPrimeZone && t.type === 'hour' ? 2.2 : (t.type === 'hour' ? 1.8 : t.type === 'half' ? 1.2 : 0.8)}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* 7. 12-Hour Clock Numbers: 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 */}
        <g pointerEvents="none" className="text-center select-none font-sans">
          {clockNumbers.map((item, idx) => {
            let fillClass = "";
            if (item.isPrimeHour) {
              fillClass = darkMode ? "fill-emerald-400 font-extrabold" : "fill-emerald-700 font-extrabold";
            } else if (item.isCardinal) {
              fillClass = darkMode ? "fill-white font-extrabold" : "fill-gray-900 font-extrabold";
            } else {
              fillClass = darkMode ? "fill-gray-300 font-semibold" : "fill-gray-600 font-semibold";
            }

            return (
              <text
                key={idx}
                x={item.x}
                y={item.y + 4.5}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`${fillClass} ${item.isCardinal ? "text-[14px]" : "text-[12.5px]"}`}
              >
                {item.display}
              </text>
            );
          })}
        </g>

        {/* 8. Center Serene Sleep & 12H Badge */}
        <g pointerEvents="none" className="select-none">
          {/* Subtle center ring */}
          <circle
            cx={cx}
            cy={cy}
            r={24}
            fill={darkMode ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.06)"}
            stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.14)"}
            strokeWidth="1"
          />
          {/* Centered Moon Icon */}
          <g transform={`translate(${cx - 8}, ${cy - 14})`}>
            <Moon 
              size={16} 
              className={darkMode ? "text-indigo-300 fill-indigo-400/50" : "text-indigo-600 fill-indigo-100"} 
            />
          </g>
          {/* Subtle 12h label below Moon */}
          <text
            x={cx}
            y={cy + 11}
            textAnchor="middle"
            dominantBaseline="middle"
            className={
              darkMode
                ? "text-[9px] font-mono font-bold tracking-widest fill-gray-400 uppercase"
                : "text-[9px] font-mono font-bold tracking-widest fill-indigo-700/80 uppercase"
            }
          >
            {isBn ? '১২ ঘণ্টা' : '12H'}
          </text>
        </g>

        {/* 9. Draggable Bedtime Handle (with Bed Icon) */}
        <g
          transform={`translate(${bedPos.x}, ${bedPos.y})`}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDown(e, 'bed')}
          filter="url(#handle-shadow-12)"
        >
          {/* Circular Handle Knob */}
          <circle
            cx={0}
            cy={0}
            r={handleRadius}
            fill={darkMode ? "#3a3e4b" : "#ffffff"}
            stroke={darkMode ? "rgba(255, 255, 255, 0.48)" : "#94a3b8"}
            strokeWidth="1.8"
            className="transition-transform duration-100 hover:scale-105 active:scale-110"
          />
          {/* Bed Icon centered inside knob */}
          <g transform="translate(-8, -8)" pointerEvents="none">
            <Bed 
              size={16} 
              className={darkMode ? "text-sky-300" : "text-sky-600"} 
              strokeWidth={2.4} 
            />
          </g>
        </g>

        {/* 10. Draggable Wake Up Handle (with Alarm Clock Icon) */}
        <g
          transform={`translate(${wakePos.x}, ${wakePos.y})`}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDown(e, 'wake')}
          filter="url(#handle-shadow-12)"
        >
          {/* Circular Handle Knob */}
          <circle
            cx={0}
            cy={0}
            r={handleRadius}
            fill={darkMode ? "#3a3e4b" : "#ffffff"}
            stroke={darkMode ? "rgba(255, 255, 255, 0.48)" : "#94a3b8"}
            strokeWidth="1.8"
            className="transition-transform duration-100 hover:scale-105 active:scale-110"
          />
          {/* Alarm Clock Icon centered inside knob */}
          <g transform="translate(-8, -8)" pointerEvents="none">
            <AlarmClock 
              size={16} 
              className={darkMode ? "text-amber-300" : "text-amber-600"} 
              strokeWidth={2.4} 
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
