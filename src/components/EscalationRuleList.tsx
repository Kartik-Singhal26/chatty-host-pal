
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EscalationRule {
  id: string;
  trigger_keywords: string[];
  escalation_type: string;
  response_template: string;
  priority_level: number;
  created_by?: string;
  created_at: string;
}

interface EscalationRuleListProps {
  rules: EscalationRule[];
}

const EscalationRuleList: React.FC<EscalationRuleListProps> = ({ rules }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Escalation Rules ({rules.length} rules)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Trigger Keywords</TableHead>
                <TableHead>Escalation Type</TableHead>
                <TableHead>Response Template</TableHead>
                <TableHead>Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.priority_level}</TableCell>
                  <TableCell>{rule.trigger_keywords.join(', ')}</TableCell>
                  <TableCell>{rule.escalation_type}</TableCell>
                  <TableCell className="max-w-xs truncate">{rule.response_template}</TableCell>
                  <TableCell>{new Date(rule.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EscalationRuleList;
