'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PredictionBar, ConfidenceMeter } from '@/components/stats-display'
import { Sparkles, Brain, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Fixture, Prediction } from '@/lib/types'

interface AIPredictionCardProps {
  fixture: Fixture
  prediction: Prediction
  className?: string
}

export function AIPredictionCard({ fixture, prediction, className }: AIPredictionCardProps) {
  const [generating, setGenerating] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)

  const homeTeam = fixture.home_team
  const awayTeam = fixture.away_team

  const generateInsight = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: homeTeam?.name,
          awayTeam: awayTeam?.name,
          prediction,
        }),
      })
      const data = await response.json()
      setAiInsight(data.insight)
    } catch (error) {
      console.error('Failed to generate insight:', error)
    } finally {
      setGenerating(false)
    }
  }

  const getWinnerPrediction = () => {
    if (prediction.home_win_probability > prediction.away_win_probability) {
      return { team: homeTeam?.name, prob: prediction.home_win_probability, type: 'home' }
    }
    return { team: awayTeam?.name, prob: prediction.away_win_probability, type: 'away' }
  }

  const winner = getWinnerPrediction()

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-transparent pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Match Prediction
          </div>
          <Badge variant="outline" className="text-[10px]">
            Model v{prediction.model_version}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className={cn(
              'mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
              winner.type === 'home' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}>
              {homeTeam?.short_name?.slice(0, 2) || 'HM'}
            </div>
            <p className="text-xs font-medium truncate">{homeTeam?.name}</p>
          </div>

          <div className="px-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">VS</p>
            <p className="text-[10px] text-muted-foreground">
              {prediction.predicted_home_score} - {prediction.predicted_away_score}
            </p>
          </div>

          <div className="text-center flex-1">
            <div className={cn(
              'mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
              winner.type === 'away' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}>
              {awayTeam?.short_name?.slice(0, 2) || 'AW'}
            </div>
            <p className="text-xs font-medium truncate">{awayTeam?.name}</p>
          </div>
        </div>

        {/* Probability Bar */}
        <div>
          <PredictionBar
            homeWin={prediction.home_win_probability}
            awayWin={prediction.away_win_probability}
            className="mb-2"
          />
          <div className="flex justify-between text-xs">
            <span className={cn(
              'font-medium',
              winner.type === 'home' ? 'text-primary' : 'text-muted-foreground'
            )}>
              {prediction.home_win_probability.toFixed(1)}%
            </span>
            <span className={cn(
              'font-medium',
              winner.type === 'away' ? 'text-primary' : 'text-muted-foreground'
            )}>
              {prediction.away_win_probability.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
          <span className="text-xs text-muted-foreground">AI Confidence</span>
          <ConfidenceMeter score={prediction.confidence_score} />
        </div>

        {/* Factors */}
        {prediction.factors && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Key Factors</p>
            <div className="grid gap-2 text-xs">
              {prediction.factors.home_form && (
                <div className="flex items-center justify-between rounded bg-secondary/30 px-2 py-1.5">
                  <span className="text-muted-foreground">Home Form</span>
                  <span className="font-mono">{prediction.factors.home_form}</span>
                </div>
              )}
              {prediction.factors.away_form && (
                <div className="flex items-center justify-between rounded bg-secondary/30 px-2 py-1.5">
                  <span className="text-muted-foreground">Away Form</span>
                  <span className="font-mono">{prediction.factors.away_form}</span>
                </div>
              )}
              {prediction.factors.head_to_head && (
                <div className="flex items-center justify-between rounded bg-secondary/30 px-2 py-1.5">
                  <span className="text-muted-foreground">H2H</span>
                  <span>{prediction.factors.head_to_head}</span>
                </div>
              )}
            </div>
            {prediction.factors.key_factor && (
              <p className="text-[11px] text-primary italic">
                {prediction.factors.key_factor}
              </p>
            )}
          </div>
        )}

        {/* AI Insight */}
        {aiInsight ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">AI Analysis</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {aiInsight}
            </p>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={generateInsight}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-3 w-3" />
                Generate AI Analysis
                <ChevronRight className="ml-auto h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
