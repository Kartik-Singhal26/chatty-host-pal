
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TrainingDialogue {
  id: string;
  category: string;
  user_message: string;
  expected_response: string;
  scenario_type: string;
  created_at: string;
  created_by?: string;
}

interface TrainingDialogueListProps {
  dialogues: TrainingDialogue[];
}

const TrainingDialogueList: React.FC<TrainingDialogueListProps> = ({ dialogues }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Dataset ({dialogues.length} dialogues)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Customer Message</TableHead>
                <TableHead>Expected Response</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dialogues.map((dialogue) => (
                <TableRow key={dialogue.id}>
                  <TableCell className="font-medium">{dialogue.category}</TableCell>
                  <TableCell className="max-w-xs truncate">{dialogue.user_message}</TableCell>
                  <TableCell className="max-w-xs truncate">{dialogue.expected_response}</TableCell>
                  <TableCell>{dialogue.scenario_type}</TableCell>
                  <TableCell>{new Date(dialogue.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainingDialogueList;
