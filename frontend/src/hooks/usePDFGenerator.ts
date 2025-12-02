/**
 * PDF Generator Hook
 * ==================
 * 
 * React hook for using the PDF Generator Web Worker.
 * Provides a clean API for generating PDFs with progress tracking.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ResumeSection } from '@/stores/documentStore';

interface GeneratorState {
  isGenerating: boolean;
  progress: number;
  status: string;
  error: string | null;
}

interface UsePDFGeneratorResult extends GeneratorState {
  generatePDF: (
    sections: ResumeSection[],
    template: 'classic' | 'modern'
  ) => Promise<{ blob: Blob; pageCount: number } | null>;
  cancel: () => void;
}

// Convert ResumeSection to worker-friendly format
function sectionsToWorkerFormat(sections: ResumeSection[]) {
  return sections.map(s => ({
    id: s.id,
    type: s.type,
    title: s.title,
    items: s.items.map(i => ({
      id: i.id,
      text: i.text,
      isBullet: i.isBullet,
      indent: i.indent,
    })),
    visible: s.visible,
    order: s.order,
  }));
}

export function usePDFGenerator(): UsePDFGeneratorResult {
  const workerRef = useRef<Worker | null>(null);
  const currentJobId = useRef<string | null>(null);
  const resolveRef = useRef<((value: any) => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);
  
  const [state, setState] = useState<GeneratorState>({
    isGenerating: false,
    progress: 0,
    status: '',
    error: null,
  });
  
  // Initialize worker
  useEffect(() => {
    // Create worker with bundler support
    workerRef.current = new Worker(
      new URL('../workers/pdfGenerator.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const data = event.data;
      
      // Ignore messages from other jobs
      if (data.id !== currentJobId.current) return;
      
      switch (data.type) {
        case 'progress':
          setState(prev => ({
            ...prev,
            progress: data.progress,
            status: data.status,
          }));
          break;
          
        case 'complete':
          setState(prev => ({
            ...prev,
            isGenerating: false,
            progress: 100,
            status: 'Complete',
            error: null,
          }));
          
          if (resolveRef.current) {
            const blob = new Blob([data.pdfBytes], { type: 'application/pdf' });
            resolveRef.current({ blob, pageCount: data.pageCount });
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
          
        case 'error':
          setState(prev => ({
            ...prev,
            isGenerating: false,
            error: data.error,
          }));
          
          if (rejectRef.current) {
            rejectRef.current(new Error(data.error));
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
      }
    };
    
    workerRef.current.onerror = (error) => {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error.message || 'Worker error',
      }));
      
      if (rejectRef.current) {
        rejectRef.current(new Error(error.message));
        resolveRef.current = null;
        rejectRef.current = null;
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  // Generate PDF
  const generatePDF = useCallback(
    async (
      sections: ResumeSection[],
      template: 'classic' | 'modern'
    ): Promise<{ blob: Blob; pageCount: number } | null> => {
      if (!workerRef.current) {
        throw new Error('Worker not initialized');
      }
      
      // Cancel any existing job
      if (currentJobId.current) {
        workerRef.current.postMessage({
          type: 'cancel',
          id: currentJobId.current,
        });
      }
      
      // Create new job
      const jobId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      currentJobId.current = jobId;
      
      setState({
        isGenerating: true,
        progress: 0,
        status: 'Starting...',
        error: null,
      });
      
      return new Promise((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        
        workerRef.current!.postMessage({
          type: 'generate',
          id: jobId,
          sections: sectionsToWorkerFormat(sections),
          template,
        });
      });
    },
    []
  );
  
  // Cancel current generation
  const cancel = useCallback(() => {
    if (workerRef.current && currentJobId.current) {
      workerRef.current.postMessage({
        type: 'cancel',
        id: currentJobId.current,
      });
      
      currentJobId.current = null;
      setState(prev => ({
        ...prev,
        isGenerating: false,
        status: 'Cancelled',
      }));
      
      if (rejectRef.current) {
        rejectRef.current(new Error('Cancelled'));
        resolveRef.current = null;
        rejectRef.current = null;
      }
    }
  }, []);
  
  return {
    ...state,
    generatePDF,
    cancel,
  };
}

export default usePDFGenerator;
