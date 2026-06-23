import { useCirculars } from '@/hooks/useCirculars';
import { Navbar } from '@/components/Navbar';
import { LEVEL_LABELS, CompetitionLevel } from '@/types/database';
import { Loader2, FileText, User, Calendar, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { devWarn } from '@/lib/dev';

// Helper function to validate URLs
const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    devWarn('Invalid document URL detected:', url);
    return false;
  }
};

const CircularsPage = () => {
  const { data: circulars = [], isLoading } = useCirculars();
  const [levelFilter, setLevelFilter] = useState<CompetitionLevel | 'all'>('all');

  const filtered = levelFilter === 'all'
    ? circulars
    : circulars.filter(c => c.target_level === levelFilter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8" />
            <h1 className="font-display text-4xl md:text-5xl tracking-wider">CIRCULARS & ANNOUNCEMENTS</h1>
          </div>
          <p className="text-white/70 mt-2">Official communications from the ministry and sports federation</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as CompetitionLevel | 'all')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="zone">Zone</SelectItem>
              <SelectItem value="subcounty">Sub-County</SelectItem>
              <SelectItem value="county">County</SelectItem>
              <SelectItem value="region">Region</SelectItem>
              <SelectItem value="national">National</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><p className="text-lg">No circulars published yet</p></div>
        ) : (
          <div className="space-y-6">
            {filtered.map(circular => (
              <div key={circular.id} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display text-2xl text-foreground">{circular.title}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span className="font-medium text-foreground">{circular.sender_name}</span>
                        <span>— {circular.sender_role}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(circular.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{LEVEL_LABELS[circular.target_level]}</Badge>
                </div>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {circular.content}
                </div>
                {isValidUrl(circular.document_url) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button 
                      asChild 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      <a href={circular.document_url!} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                        Download Document
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularsPage;
