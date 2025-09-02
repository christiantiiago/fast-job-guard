import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  context?: Array<{ id: string; text: string }>;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: [number, number]) => void;
  placeholder?: string;
  className?: string;
}

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTQwcmdlaGUwN3E0Mmxxb2FuY29jdG16In0.FKBfqIhY5AdAvHEHj5Iffw';

export function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Digite o endereço...",
  className 
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        new URLSearchParams({
          access_token: MAPBOX_ACCESS_TOKEN,
          country: 'BR',
          language: 'pt',
          limit: '5',
          types: 'address,poi'
        })
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.place_name);
    onChange(suggestion.place_name, suggestion.center);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const formatSuggestion = (suggestion: AddressSuggestion) => {
    // Extract neighborhood and city from context
    const neighborhood = suggestion.context?.find(c => c.id.includes('neighborhood'))?.text;
    const city = suggestion.context?.find(c => c.id.includes('place'))?.text;
    const state = suggestion.context?.find(c => c.id.includes('region'))?.text;

    const parts = [suggestion.place_name];
    if (neighborhood && !suggestion.place_name.includes(neighborhood)) {
      parts.push(neighborhood);
    }
    if (city && !suggestion.place_name.includes(city)) {
      parts.push(city);
    }
    if (state && !parts.join(' ').includes(state)) {
      parts.push(state);
    }

    return parts.filter(Boolean).join(', ');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("pl-10", className)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="ghost"
              className="w-full justify-start px-3 py-2 h-auto text-left"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {suggestion.place_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {formatSuggestion(suggestion)}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}