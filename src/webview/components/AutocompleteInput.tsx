import React, { useEffect, useRef, useState } from "react";
import { useAutoGrow } from "../helpers/useAutoGrow";
const AutocompleteInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
}> = ({ value, onChange, placeholder, suggestions, className }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  useAutoGrow(inputRef, value);

  useEffect(() => {
    if (value) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
    setActiveSuggestionIndex(0);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !showSuggestions) {
      e.preventDefault();
      return;
    }
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredSuggestions.length > 0) {
      e.preventDefault();
      onChange(filteredSuggestions[activeSuggestionIndex]);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="autocomplete-container">
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`autogrow-textarea${className ? ` ${className}` : ""}`}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div ref={suggestionsRef} className="autocomplete-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`autocomplete-item ${
                index === activeSuggestionIndex ? "active" : ""
              }`}
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
