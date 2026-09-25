import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ChevronDown, Package, Check, Tag } from 'lucide-react';
import { Product } from '../types';
import { NewProductModal } from './NewProductModal';

interface Props {
  value: string;
  selectedProductId?: string;
  products: Product[];
  placeholder?: string;
  onSelectProduct: (product: Product) => void;
  onChangeText: (text: string) => void;
  onSaveNewProduct: (product: Product) => void;
  categories?: string[];
}

export const ProductPickerInput: React.FC<Props> = ({
  value,
  selectedProductId,
  products,
  placeholder = 'Mahsulot nomini yozing yoki tanlang...',
  onSelectProduct,
  onChangeText,
  onSaveNewProduct,
  categories
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered products list based on query (searched by Name, SKU, Brand, Model, Barcode)
  const query = value.trim().toLowerCase();
  const filteredProducts = products.filter((p) => {
    if (!query) return true;
    const nameMatch = p.name.toLowerCase().includes(query);
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(query) : false;
    const brandMatch = p.brand ? p.brand.toLowerCase().includes(query) : false;
    const modelMatch = p.model ? p.model.toLowerCase().includes(query) : false;
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
    return nameMatch || skuMatch || brandMatch || modelMatch || barcodeMatch;
  });

  // Seamless click-to-add selection handler
  const handleSelect = (prod: Product, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelectProduct(prod);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleProductCreated = (newProd: Product) => {
    onSaveNewProduct(newProd);
    onSelectProduct(newProd);
    setIsModalOpen(false);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  // Keyboard navigation support (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen) {
        if (highlightIndex >= 0 && filteredProducts[highlightIndex]) {
          e.preventDefault();
          handleSelect(filteredProducts[highlightIndex], e);
        } else if (filteredProducts.length === 1) {
          e.preventDefault();
          handleSelect(filteredProducts[0], e);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required
          value={value}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            onChangeText(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          placeholder={placeholder}
          className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-medium text-xs transition-colors"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 flex flex-col text-xs"
          onMouseDown={(e) => {
            // Prevent blur of container
            e.stopPropagation();
          }}
        >
          {/* Scrollable Products List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-slate-500">
                <p className="text-xs">"{value}" nomli tovar topilmadi</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quyidagi tugma orqali yangi tovar sifatida ochishingiz mumkin
                </p>
              </div>
            ) : (
              filteredProducts.map((prod, index) => {
                const isSelected = prod.id === selectedProductId || prod.name.toLowerCase() === value.toLowerCase();
                const isHighlighted = index === highlightIndex;
                const unitLabel = prod.unit || 'dona';

                return (
                  <div
                    key={prod.id}
                    onMouseDown={(e) => handleSelect(prod, e)}
                    onClick={(e) => handleSelect(prod, e)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors select-none ${
                      isSelected
                        ? 'bg-blue-100/80 text-blue-900 font-semibold'
                        : isHighlighted
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        <span>{prod.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono truncate">
                        <span>SKU: {prod.sku}</span>
                        {prod.brand && <span>· {prod.brand}</span>}
                        {prod.model && <span>{prod.model}</span>}
                        {prod.barcode && <span>· Kod: {prod.barcode}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                        {prod.totalQuantity} {unitLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Row: + Mahsulot yaratish */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsModalOpen(true);
                setIsOpen(false);
              }}
              onClick={() => {
                setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Yangi mahsulot yaratish</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal to create new product */}
      {isModalOpen && (
        <NewProductModal
          isOpen={isModalOpen}
          initialName={value}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onSaveProduct={handleProductCreated}
        />
      )}
    </div>
  );
};
