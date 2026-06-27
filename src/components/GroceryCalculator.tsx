import React, { useState, useEffect } from 'react';
import { ShoppingBag, Trash2, Plus, RefreshCw, HelpCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GroceryItem {
  id: string;
  name: string;
  baseUnit: string;
  pricePerUnit: number;
  desiredQty: number;
  desiredUnit: string;
  calculatedPrice: number;
}

interface GroceryCalculatorProps {
  darkMode: boolean;
  lang?: 'en' | 'bn';
}

export default function GroceryCalculator({ darkMode, lang = 'en' }: GroceryCalculatorProps) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('kg');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [desiredQty, setDesiredQty] = useState<string>('');
  const [desiredPrice, setDesiredPrice] = useState<string>('');
  const [desiredUnit, setDesiredUnit] = useState('kg');
  const [lastModified, setLastModified] = useState<'qty' | 'price'>('qty');

  // Load items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ratbod_grocery_items');
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse grocery items:', e);
    }
  }, []);

  // Save items to localStorage whenever they change
  const saveItems = (updatedItems: GroceryItem[]) => {
    setItems(updatedItems);
    try {
      localStorage.setItem('ratbod_grocery_items', JSON.stringify(updatedItems));
    } catch (e) {
      console.error('Failed to save grocery items:', e);
    }
  };

  // Synchronize desiredUnit when baseUnit changes
  useEffect(() => {
    if (baseUnit === 'kg') setDesiredUnit('kg');
    else if (baseUnit === 'g') setDesiredUnit('g');
    else if (baseUnit === 'L') setDesiredUnit('L');
    else if (baseUnit === 'ml') setDesiredUnit('ml');
    else if (baseUnit === 'dozen') setDesiredUnit('dozen');
    else if (baseUnit === 'piece') setDesiredUnit('piece');
    else if (baseUnit === 'pack') setDesiredUnit('pack');
  }, [baseUnit]);

  // Translate labels and helper strings
  const labels = {
    en: {
      title: "Grocery Calculator",
      itemName: "Item Name",
      itemNamePlaceholder: "e.g., Rice, Milk, Onions",
      baseUnit: "Price Base Unit",
      pricePerUnit: "Price per Base Unit",
      desiredQty: "Desired Quantity",
      desiredPrice: "Desired Price",
      desiredPricePlaceholder: "e.g., 50",
      desiredUnit: "Unit to Buy",
      addBtn: "Add to Bag",
      totalPrice: "Total Groceries Value",
      clearBtn: "Clear Bag",
      downloadBtn: "Download Summary",
      emptyBag: "Your shopping bag is empty.",
      exactPrice: "Calculated Price",
      exactQty: "Calculated Quantity",
      priceSummary: "Calculation",
      itemsInBag: "Items in Bag",
      bdt: "৳ BDT",
      bdtSuffix: "৳",
      kg: "Kilogram (kg)",
      g: "Gram (g)",
      L: "Liter (L)",
      ml: "Milliliter (ml)",
      piece: "Piece (qty)",
      dozen: "Dozen",
      pack: "Pack",
      units: "Units",
    },
    bn: {
      title: "বাজার হিসাবকারী",
      itemName: "পণ্যের নাম",
      itemNamePlaceholder: "যেমন: চাল, দুধ, পেঁয়াজ",
      baseUnit: "মূল্যের বেস ইউনিট",
      pricePerUnit: "প্রতি ইউনিটের মূল্য",
      desiredQty: "ক্রয়কৃত পরিমাণ",
      desiredPrice: "কাঙ্ক্ষিত মূল্য",
      desiredPricePlaceholder: "যেমন: ৫০",
      desiredUnit: "ক্রয়ের ইউনিট",
      addBtn: "ব্যাগে যুক্ত করুন",
      totalPrice: "মোট বাজারের মূল্য",
      clearBtn: "ব্যাগ খালি করুন",
      downloadBtn: "তালিকা ডাউনলোড",
      emptyBag: "আপনার বাজারের ব্যাগটি খালি।",
      exactPrice: "হিসাবকৃত মূল্য",
      exactQty: "হিসাবকৃত পরিমাণ",
      priceSummary: "হিসাব",
      itemsInBag: "ব্যাগের পণ্যসমূহ",
      bdt: "৳ টাকা",
      bdtSuffix: "৳",
      kg: "কেজি (kg)",
      g: "গ্রাম (g)",
      L: "লিটার (L)",
      ml: "মিলি (ml)",
      piece: "টি / পিস (piece)",
      dozen: "ডজন (dozen)",
      pack: "প্যাকেট (pack)",
      units: "টি পণ্য",
    }
  }[lang];

  // Number translation helper for Bengali digits
  const formatNum = (num: number | string | undefined | null, decimals: number = 2) => {
    if (num === undefined || num === null) return '';
    
    let finalStr = '';
    if (typeof num === 'number') {
      // If it's a whole number, don't show decimals unless requested
      if (Number.isInteger(num)) {
        finalStr = num.toString();
      } else {
        finalStr = num.toFixed(decimals);
        // Strip trailing zeros if any
        if (finalStr.endsWith('.00')) {
          finalStr = finalStr.substring(0, finalStr.length - 3);
        } else if (finalStr.includes('.') && finalStr.endsWith('0')) {
          finalStr = finalStr.substring(0, finalStr.length - 1);
        }
      }
    } else {
      finalStr = num.toString();
    }

    if (lang !== 'bn') return finalStr;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return finalStr.replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit)]);
  };

  // Unit text translator
  const translateUnit = (u: string) => {
    if (lang === 'bn') {
      switch (u) {
        case 'kg': return 'কেজি';
        case 'g': return 'গ্রাম';
        case 'L': return 'লিটার';
        case 'ml': return 'মিলি';
        case 'piece': return 'টি';
        case 'dozen': return 'ডজন';
        case 'pack': return 'প্যাকেট';
        default: return u;
      }
    }
    return u;
  };

  // Conversion logic multiplier
  const getConversionMultiplier = (from: string, to: string): number => {
    if (from === to) return 1;

    // Weight conversions
    if (from === 'kg' && to === 'g') return 0.001;
    if (from === 'g' && to === 'kg') return 1000;

    // Volume conversions
    if (from === 'L' && to === 'ml') return 0.001;
    if (from === 'ml' && to === 'L') return 1000;

    // Dozen / Piece conversions
    if (from === 'dozen' && to === 'piece') return 1 / 12;
    if (from === 'piece' && to === 'dozen') return 12;

    return 1;
  };

  // Real-time calculated price calculation
  const getCalculatedPrice = (): number => {
    const price = parseFloat(pricePerUnit);
    const qty = parseFloat(desiredQty);
    if (isNaN(price) || isNaN(qty) || price < 0 || qty < 0) return 0;

    const multiplier = getConversionMultiplier(baseUnit, desiredUnit);
    return price * (qty * multiplier);
  };

  // Synchronize desiredQty/desiredPrice when pricing parameters change
  useEffect(() => {
    const price = parseFloat(pricePerUnit);
    if (isNaN(price) || price <= 0) return;
    const multiplier = getConversionMultiplier(baseUnit, desiredUnit);

    if (lastModified === 'qty') {
      const qty = parseFloat(desiredQty);
      if (!isNaN(qty) && qty >= 0) {
        setDesiredPrice((price * qty * multiplier).toFixed(2));
      } else {
        setDesiredPrice('');
      }
    } else {
      const budget = parseFloat(desiredPrice);
      if (!isNaN(budget) && budget >= 0 && multiplier > 0) {
        setDesiredQty((budget / (price * multiplier)).toFixed(3));
      } else {
        setDesiredQty('');
      }
    }
  }, [pricePerUnit, baseUnit, desiredUnit]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(pricePerUnit);
    const qty = parseFloat(desiredQty);
    if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return;

    const calculated = getCalculatedPrice();
    const newItem: GroceryItem = {
      id: Date.now().toString(),
      name: name.trim() || (lang === 'bn' ? 'বাজারের পণ্য' : 'Grocery Item'),
      baseUnit,
      pricePerUnit: price,
      desiredQty: qty,
      desiredUnit,
      calculatedPrice: calculated,
    };

    saveItems([newItem, ...items]);
    setName('');
    setPricePerUnit('');
    setDesiredQty('');
    setDesiredPrice('');
    setLastModified('qty');
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    saveItems(updated);
  };

  const handleClearList = () => {
    const confirmMsg = lang === 'bn' 
      ? 'আপনি কি নিশ্চিত যে আপনি আপনার বাজারের ব্যাগ খালি করতে চান?' 
      : 'Are you sure you want to clear your grocery bag?';
    if (window.confirm(confirmMsg)) {
      saveItems([]);
    }
  };

  const handleDownloadList = () => {
    if (items.length === 0) return;

    let content = "";
    const border = "========================================\n";
    const divider = "----------------------------------------\n";

    if (lang === 'bn') {
      content += border;
      content += "             বাজারের ফর্দ (RatboD)\n";
      content += border;
      content += `তারিখ: ${new Date().toLocaleDateString('bn-BD')}\n`;
      content += `মোট পণ্য: ${formatNum(items.length, 0)} টি\n`;
      content += `সর্বমোট মূল্য: ${formatNum(totalGroceryPrice)} টাকা\n`;
      content += border + "\n";
      content += "পণ্যের তালিকা:\n";
      content += divider;

      items.forEach((item, index) => {
        content += `${formatNum(index + 1, 0)}. ${item.name}\n`;
        content += `   পরিমাণ: ${formatNum(item.desiredQty)} ${translateUnit(item.desiredUnit)}\n`;
        content += `   দর: ${formatNum(item.pricePerUnit)} টাকা / ${translateUnit(item.baseUnit)}\n`;
        content += `   উপমোট: ${formatNum(item.calculatedPrice)} টাকা\n`;
        content += divider;
      });

      content += "\n" + border;
      content += "RatboD বাজার হিসাবকারী ব্যবহার করার জন্য ধন্যবাদ!\n";
      content += border;
    } else {
      content += border;
      content += "         GROCERY SHOPPING LIST (RatboD)\n";
      content += border;
      content += `Date: ${new Date().toLocaleDateString()}\n`;
      content += `Total Items: ${items.length}\n`;
      content += `Total Price: ${totalGroceryPrice.toFixed(2)} BDT\n`;
      content += border + "\n";
      content += "Items:\n";
      content += divider;

      items.forEach((item, index) => {
        content += `${index + 1}. ${item.name}\n`;
        content += `   Quantity: ${item.desiredQty} ${translateUnit(item.desiredUnit)}\n`;
        content += `   Price per Unit: ${item.pricePerUnit} BDT / ${translateUnit(item.baseUnit)}\n`;
        content += `   Subtotal: ${item.calculatedPrice.toFixed(2)} BDT\n`;
        content += divider;
      });

      content += "\n" + border;
      content += "Thank you for using RatboD Grocery Calculator!\n";
      content += border;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", lang === 'bn' ? "বাজারের_ফর্দ_RatboD.txt" : "grocery_list_ratbod.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get options for desired buy unit based on selected base price unit
  const getDesiredUnitOptions = () => {
    switch (baseUnit) {
      case 'kg':
        return [
          { value: 'kg', label: labels.kg },
          { value: 'g', label: labels.g }
        ];
      case 'g':
        return [
          { value: 'g', label: labels.g },
          { value: 'kg', label: labels.kg }
        ];
      case 'L':
        return [
          { value: 'L', label: labels.L },
          { value: 'ml', label: labels.ml }
        ];
      case 'ml':
        return [
          { value: 'ml', label: labels.ml },
          { value: 'L', label: labels.L }
        ];
      case 'dozen':
        return [
          { value: 'dozen', label: labels.dozen },
          { value: 'piece', label: labels.piece }
        ];
      case 'piece':
        return [
          { value: 'piece', label: labels.piece },
          { value: 'dozen', label: labels.dozen }
        ];
      case 'pack':
        return [
          { value: 'pack', label: labels.pack }
        ];
      default:
        return [{ value: baseUnit, label: baseUnit }];
    }
  };

  const totalGroceryPrice = items.reduce((sum, item) => sum + item.calculatedPrice, 0);
  const currentCalcPrice = getCalculatedPrice();

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-sky-500 flex items-center gap-2">
            <ShoppingBag className="text-sky-500 animate-pulse" size={24} />
            {labels.title}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Panel */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleAddItem} className="space-y-4">
            {/* Item Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {labels.itemName}
              </label>
              <input
                type="text"
                placeholder={labels.itemNamePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border border-gray-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Base Pricing Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {labels.baseUnit}
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  className="w-full bg-transparent border border-gray-700/50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-sky-500 transition-all [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  <option value="kg">{labels.kg}</option>
                  <option value="g">{labels.g}</option>
                  <option value="L">{labels.L}</option>
                  <option value="ml">{labels.ml}</option>
                  <option value="piece">{labels.piece}</option>
                  <option value="dozen">{labels.dozen}</option>
                  <option value="pack">{labels.pack}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {labels.pricePerUnit}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    required
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    className="w-full bg-transparent border border-gray-700/50 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-sky-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    {labels.bdtSuffix}
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Desired Section (Grid of 3 elements) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {labels.desiredUnit}
                </label>
                <select
                  value={desiredUnit}
                  onChange={(e) => setDesiredUnit(e.target.value)}
                  className="w-full bg-transparent border border-gray-700/50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-sky-500 transition-all [&>option]:bg-neutral-900 [&>option]:text-white"
                >
                  {getDesiredUnitOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {labels.desiredQty}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={desiredQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDesiredQty(val);
                    setLastModified('qty');
                    const qty = parseFloat(val);
                    const price = parseFloat(pricePerUnit);
                    if (!isNaN(qty) && !isNaN(price) && price > 0) {
                      const multiplier = getConversionMultiplier(baseUnit, desiredUnit);
                      setDesiredPrice((price * qty * multiplier).toFixed(2));
                    } else {
                      setDesiredPrice('');
                    }
                  }}
                  className="w-full bg-transparent border border-gray-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {labels.desiredPrice}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={labels.desiredPricePlaceholder}
                    value={desiredPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDesiredPrice(val);
                      setLastModified('price');
                      const budget = parseFloat(val);
                      const price = parseFloat(pricePerUnit);
                      if (!isNaN(budget) && !isNaN(price) && price > 0) {
                        const multiplier = getConversionMultiplier(baseUnit, desiredUnit);
                        if (multiplier > 0) {
                          setDesiredQty((budget / (price * multiplier)).toFixed(3));
                        }
                      } else {
                        setDesiredQty('');
                      }
                    }}
                    className="w-full bg-transparent border border-gray-700/50 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-sky-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    {labels.bdtSuffix}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Calculation Display Box */}
            <AnimatePresence mode="wait">
              {currentCalcPrice > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    darkMode ? "bg-sky-500/5 border-sky-500/20" : "bg-sky-500/10 border-sky-500/20"
                  )}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {labels.priceSummary}
                    </span>
                    <p className="text-xs font-medium text-gray-400 mt-1">
                      {formatNum(desiredQty)} {translateUnit(desiredUnit)} @ {formatNum(pricePerUnit)} {labels.bdtSuffix}/{translateUnit(baseUnit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500 block">
                      {labels.exactPrice}
                    </span>
                    <span className="text-xl font-bold tracking-tight text-sky-500">
                      {formatNum(currentCalcPrice)} {labels.bdtSuffix}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!pricePerUnit || !desiredQty || parseFloat(pricePerUnit) <= 0 || parseFloat(desiredQty) <= 0}
              className="w-full bg-sky-500 text-white py-3.5 rounded-xl font-bold hover:bg-sky-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-sky-500/10"
            >
              <Plus size={18} />
              {labels.addBtn}
            </button>
          </form>
        </div>

        {/* Shopping Bag / List Panel */}
        <div className="lg:col-span-7 flex flex-col h-[400px] lg:h-[450px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {labels.itemsInBag} ({formatNum(items.length, 0)})
            </span>
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadList}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                    darkMode ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                  )}
                >
                  <Download size={12} />
                  {labels.downloadBtn}
                </button>
                <button
                  onClick={handleClearList}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                    darkMode ? "bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400" : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  )}
                >
                  <Trash2 size={12} />
                  {labels.clearBtn}
                </button>
              </div>
            )}
          </div>

          <div className={cn(
            "flex-1 overflow-y-auto rounded-3xl border p-4 space-y-3 custom-scrollbar",
            darkMode ? "bg-black/20 border-white/5" : "bg-gray-50 border-gray-100"
          )}>
            <AnimatePresence initial={false}>
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-2 py-10"
                >
                  <div className="p-3 bg-gray-500/10 rounded-full text-gray-400">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    {labels.emptyBag}
                  </p>
                </motion.div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between gap-4 transition-colors",
                      darkMode ? "bg-[#0A0A0A] border-white/5 hover:border-white/10" : "bg-white border-gray-200/50 hover:border-gray-200"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("text-sm font-bold truncate", darkMode ? "text-white" : "text-gray-900")}>
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {formatNum(item.desiredQty)} {translateUnit(item.desiredUnit)} @ {formatNum(item.pricePerUnit)} {labels.bdtSuffix}/{translateUnit(item.baseUnit)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-bold tracking-tight text-sky-500">
                          {formatNum(item.calculatedPrice)} {labels.bdtSuffix}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className={cn(
                          "p-2 rounded-xl transition-all cursor-pointer",
                          darkMode ? "bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400" : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Aggregate Summary Panel */}
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-4 p-5 rounded-3xl border flex items-center justify-between",
                darkMode ? "bg-[#0A0A0A] border-white/5 shadow-2xl shadow-black/50" : "bg-white border-gray-100 shadow-sm"
              )}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {labels.totalPrice}
                </span>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {formatNum(items.length, 0)} {lang === 'bn' ? 'টি পণ্য' : 'items'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black tracking-tighter text-sky-500">
                  {formatNum(totalGroceryPrice)} {labels.bdtSuffix}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
