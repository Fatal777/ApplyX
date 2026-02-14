import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Target, 
  Award,
  ArrowRight,
  Download,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { InterviewFeedback } from '@/services/interviewService';

interface FeedbackViewProps {
  feedback: InterviewFeedback;
  onRetry: () => void;
  onBack: () => void;
}

/**
 * FeedbackView Component
 * Displays comprehensive interview feedback with scores and recommendations
 */
export function FeedbackView({ feedback, onRetry, onBack }: FeedbackViewProps) {
  // Scroll fix — explicit wheel handler for parent layout compatibility
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += e.deltaY;
      scrollContainerRef.current.scrollLeft += e.deltaX;
    }
  }, []);

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get readiness badge
  const getReadinessBadge = () => {
    const score = feedback.overall_score;
    if (score >= 80) {
      return <Badge className="bg-green-500">Interview Ready</Badge>;
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-500">Almost Ready</Badge>;
    }
    return <Badge className="bg-red-500">Needs Practice</Badge>;
  };

  return (
    <div
      ref={scrollContainerRef}
      onWheel={handleWheel}
      className="h-screen overflow-y-auto"
      style={{ scrollbarWidth: 'thin' }}
    >
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Award className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
        <h1 className="text-3xl font-bold mb-2">Interview Complete!</h1>
        <p className="text-gray-600">Here's your detailed performance feedback</p>
      </motion.div>

      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white text-center">
            <h2 className="text-xl font-medium mb-2">Overall Score</h2>
            <div className="text-7xl font-bold mb-2">{Math.round(feedback.overall_score)}</div>
            <p className="text-indigo-200">out of 100</p>
            <div className="mt-4">{getReadinessBadge()}</div>
          </div>
        </Card>
      </motion.div>

      {/* Category Scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Category Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(feedback.category_scores).map(([category, score]) => (
              <div key={category}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium capitalize">
                    {category.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-sm font-bold ${getScoreColor(score as number)}`}>
                    {Math.round(score as number)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(score as number)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Areas to Improve */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <TrendingUp className="w-5 h-5" />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {feedback.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Feedback */}
      {feedback.detailed_feedback && Object.keys(feedback.detailed_feedback).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(feedback.detailed_feedback).map(([key, value]) => (
                <div key={key} className="border-b last:border-0 pb-3 last:pb-0">
                  <h4 className="font-medium text-gray-800 capitalize mb-1">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-gray-600 text-sm">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {feedback.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Button onClick={onRetry} size="lg" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Practice Again
        </Button>
        <Button onClick={onBack} variant="outline" size="lg">
          Back to Dashboard
        </Button>
      </motion.div>

      {/* Timestamp */}
      <p className="text-center text-sm text-gray-400">
        Feedback generated on {new Date(feedback.generated_at).toLocaleString()}
      </p>
    </div>
    </div>
  );
}

export default FeedbackView;
