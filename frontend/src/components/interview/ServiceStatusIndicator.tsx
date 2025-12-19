import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import interviewService, { type ServiceHealth } from '@/services/interviewService';

interface ServiceStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function ServiceStatusIndicator({ className, showDetails = false }: ServiceStatusIndicatorProps) {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(showDetails);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const healthData = await interviewService.checkHealth();
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check service health');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (available: boolean | undefined) => {
    if (available === undefined) return <AlertCircle className="w-4 h-4 text-gray-400" />;
    return available 
      ? <CheckCircle className="w-4 h-4 text-green-600" />
      : <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (available: boolean | undefined) => {
    if (available === undefined) return 'text-gray-600';
    return available ? 'text-green-700' : 'text-red-700';
  };

  const getStatusBadge = (available: boolean | undefined) => {
    if (available === undefined) return 'bg-gray-100 text-gray-700';
    return available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  if (loading && !health) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Checking services...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-4 border-red-200 bg-red-50", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Services Offline</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </Card>
    );
  }

  if (!health) return null;

  const sttAvailable = health.speech_service?.stt_available;
  const ttsAvailable = health.speech_service?.tts_available;
  const aiAvailable = health.ai_service?.available;
  const allHealthy = sttAvailable && ttsAvailable && aiAvailable;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {allHealthy ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          )}
          <div>
            <p className="font-medium">
              {allHealthy ? 'All Systems Operational' : 'Service Degraded'}
            </p>
            <p className="text-xs text-gray-500">
              Backend services: {health.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-3">
          {/* STT Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(sttAvailable)}
              <span className={cn("text-sm font-medium", getStatusColor(sttAvailable))}>
                Speech-to-Text
              </span>
            </div>
            <div className="flex items-center gap-2">
              {health.speech_service?.stt_provider && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  getStatusBadge(sttAvailable)
                )}>
                  {health.speech_service.stt_provider}
                </span>
              )}
            </div>
          </div>

          {/* TTS Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(ttsAvailable)}
              <span className={cn("text-sm font-medium", getStatusColor(ttsAvailable))}>
                Text-to-Speech
              </span>
            </div>
            <div className="flex items-center gap-2">
              {health.speech_service?.tts_provider && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  getStatusBadge(ttsAvailable)
                )}>
                  {health.speech_service.tts_provider}
                </span>
              )}
            </div>
          </div>

          {/* AI Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(aiAvailable)}
              <span className={cn("text-sm font-medium", getStatusColor(aiAvailable))}>
                AI Service
              </span>
            </div>
            <div className="flex items-center gap-2">
              {health.ai_service?.model && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  getStatusBadge(aiAvailable)
                )}>
                  {health.ai_service.model.split('-').slice(0, 2).join('-')} {/* Show "gemini-2.0" */}
                </span>
              )}
              {health.ai_service?.provider && (
                <span className="text-xs text-gray-500">
                  ({health.ai_service.provider})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ServiceStatusIndicator;
