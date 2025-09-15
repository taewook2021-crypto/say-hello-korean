import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchBarProps {
  onSearch: (query: string, type: 'subject' | 'book' | 'chapter') => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'subject' | 'book' | 'chapter'>('subject');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), searchType);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={searchType} onValueChange={(value: 'subject' | 'book' | 'chapter') => setSearchType(value)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="subject">과목</SelectItem>
            <SelectItem value="book">교재</SelectItem>
            <SelectItem value="chapter">단원</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          placeholder={`${searchType === 'subject' ? '과목' : searchType === 'book' ? '교재' : '단원'}명을 입력하세요`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        
        <Button onClick={handleSearch} size="icon" disabled={!searchQuery.trim()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}