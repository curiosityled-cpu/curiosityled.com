import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CourseCompletionTable({ rows }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Completion by course</CardTitle>
        <p className="text-xs text-muted-foreground">
          Every course with at least one learner enrolled.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No enrolments yet. Assign a course and its progress will appear here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="w-[160px]">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.course_title}</TableCell>
                  <TableCell className="text-right">{row.enrolled}</TableCell>
                  <TableCell className="text-right">{row.completed}</TableCell>
                  <TableCell className="text-right">
                    {row.overdue > 0 ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        {row.overdue}
                      </Badge>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.completion_rate} className="h-1.5" />
                      <span className="text-xs text-muted-foreground w-9 text-right">
                        {row.completion_rate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}