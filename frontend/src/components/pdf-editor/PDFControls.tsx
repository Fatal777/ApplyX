import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  Search,
  Replace,
  Undo,
  Redo,
  FileText,
  Save,
  RefreshCw
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PDFControlsProps {
  className?: string;
  onUpload?: () => void;
  onExport?: () => void;
}

const PDFControls: React.FC<PDFControlsProps> = ({ 
  className = '',
  onUpload,
  onExport 
}) => {
  const { toast } = useToast();
  const {
    currentPage,
    pageCount,
    zoom,
    editOperations,
    setCurrentPage,
    setZoom,
    undoLastEdit,
    redoEdit,
    replaceAllText,
    reset,
  } = useDocumentStore();

  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);

  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.findIndex(z => z >= zoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.findIndex(z => z >= zoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1]);
    }
  };

  const handleFitToWidth = () => {
    // Calculate zoom to fit width (assuming A4 width of 595 points)
    const containerWidth = window.innerWidth - 400; // Subtract sidebars
    const newZoom = containerWidth / 595;
    setZoom(Math.max(0.25, Math.min(4, newZoom)));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page);
    }
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(pageCount);
  const handlePreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const handleNextPage = () => setCurrentPage(Math.min(pageCount, currentPage + 1));

  const handleReplaceAll = () => {
    if (!searchText) {
      toast({
        title: 'Search text required',
        description: 'Please enter text to search for',
        variant: 'destructive',
      });
      return;
    }

    replaceAllText(searchText, replaceText);
    toast({
      title: 'Text replaced',
      description: `Replaced all occurrences of "${searchText}" with "${replaceText}"`,
    });
    setSearchText('');
    setReplaceText('');
    setShowReplace(false);
  };

  const handleUndo = () => {
    if (editOperations.length > 0) {
      undoLastEdit();
      toast({
        title: 'Undo successful',
        description: 'Last edit has been undone',
      });
    }
  };

  const handleRedo = () => {
    redoEdit();
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* File Operations */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            title="Upload PDF"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={!pageCount || editOperations.length === 0}
            title="Export PDF"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={!pageCount}
            title="Reset Document"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Edit Operations */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={editOperations.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={true} // Redo not fully implemented yet
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 flex items-center ml-2">
            {editOperations.length} edits
          </span>
        </div>

        {/* Search and Replace */}
        <div className="space-y-2">
          <Popover open={showReplace} onOpenChange={setShowReplace}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Replace className="w-4 h-4 mr-2" />
                Find & Replace
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Find:</label>
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search text..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Replace with:</label>
                  <Input
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace text..."
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleReplaceAll}
                  className="w-full"
                  size="sm"
                >
                  Replace All
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Page Navigation */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Page Navigation</div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <Input
                type="number"
                min={1}
                max={pageCount}
                value={currentPage}
                onChange={handlePageInputChange}
                className="w-16 h-8 text-center"
              />
              <span className="text-sm text-gray-500">/ {pageCount}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage === pageCount}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLastPage}
              disabled={currentPage === pageCount}
              className="h-8 w-8"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Zoom</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="h-8 w-8"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[zoom * 100]}
              onValueChange={([value]) => setZoom(value / 100)}
              min={25}
              max={400}
              step={25}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="h-8 w-8"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToWidth}
            >
              <Maximize className="w-4 h-4 mr-2" />
              Fit Width
            </Button>
          </div>
        </div>

        {/* Document Info */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>{pageCount} pages</span>
          </div>
          {editOperations.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Save className="w-4 h-4" />
              <span>{editOperations.length} unsaved changes</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PDFControls;