import { AlertCircle, ArrowRight, Brain, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";

interface AnomalyItem {
  title: string;
  affected: string;
  rootCause: string;
  confidence: number;
  severity: "high" | "medium" | "low";
  actions: string[];
  mlInsights: string[];
  trends: {
    metric: string;
    change: number;
    timeframe: string;
  }[];
  prediction: {
    likelihood: number;
    timeframe: string;
    impact: string;
  };
}

const anomalies: AnomalyItem[] = [
  {
    title: "Unusual spike in error rates",
    affected: "API Gateway, Auth Service",
    rootCause: "Database connection pool exhaustion",
    confidence: 92,
    severity: "high",
    actions: [
      "Increase connection pool size",
      "Implement connection pooling metrics",
      "Review query optimization"
    ],
    mlInsights: [
      "Pattern matches previous incidents from last month",
      "85% correlation with high traffic periods",
      "Similar to known DDoS attack patterns"
    ],
    trends: [
      {
        metric: "Error Rate",
        change: 150,
        timeframe: "Last 1 hour"
      },
      {
        metric: "Response Time",
        change: 75,
        timeframe: "Last 30 minutes"
      }
    ],
    prediction: {
      likelihood: 85,
      timeframe: "Next 2 hours",
      impact: "High risk of service degradation"
    }
  },
  {
    title: "Memory usage anomaly detected",
    affected: "Worker Nodes",
    rootCause: "Memory leak in processing service",
    confidence: 87,
    severity: "medium",
    actions: [
      "Restart affected services",
      "Review memory allocation",
      "Update monitoring thresholds"
    ],
    mlInsights: [
      "Gradual increase pattern detected",
      "90% similar to known memory leak signatures",
      "Predicted to reach critical levels in 2 hours"
    ],
    trends: [
      {
        metric: "Memory Usage",
        change: 45,
        timeframe: "Last 2 hours"
      }
    ],
    prediction: {
      likelihood: 78,
      timeframe: "Next 4 hours",
      impact: "Moderate risk of performance degradation"
    }
  }
];

export function AnomalyDetection() {
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Anomaly Detection</CardTitle>
        <Brain className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {anomalies.map((anomaly, index) => (
            <div key={index} className="space-y-4 border-b pb-6 last:border-0">
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 ${
                  anomaly.severity === "high" ? "text-destructive" : 
                  anomaly.severity === "medium" ? "text-yellow-500" : 
                  "text-blue-500"
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{anomaly.title}</h4>
                    <span className="text-sm text-primary">
                      {anomaly.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Affected: {anomaly.affected}
                  </p>
                </div>
              </div>

              <div className="ml-8 space-y-4">
                <div>
                  <p className="text-sm font-medium">Root Cause Analysis:</p>
                  <p className="text-sm text-muted-foreground">{anomaly.rootCause}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-primary">Trend Analysis:</p>
                  <div className="mt-2 space-y-2">
                    {anomaly.trends.map((trend, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{trend.metric}:</span>
                        <span className={trend.change > 50 ? "text-destructive" : "text-green-500"}>
                          {trend.change}% increase
                        </span>
                        <span className="text-muted-foreground">in {trend.timeframe}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-primary">AI Prediction:</p>
                  <div className="mt-2 rounded-md bg-primary/10 p-3 text-sm">
                    <p>{anomaly.prediction.likelihood}% likelihood in {anomaly.prediction.timeframe}</p>
                    <p className="mt-1 text-destructive">{anomaly.prediction.impact}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-primary">ML Insights:</p>
                  <ul className="mt-2 space-y-1">
                    {anomaly.mlInsights.map((insight, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  {anomaly.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => {
                        toast({
                          title: "Action Triggered",
                          description: `Executing: ${action}`,
                        });
                      }}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}