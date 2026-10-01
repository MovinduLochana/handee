import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="max-w-md w-full rounded-none border-border">
        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
          <div className="p-3 bg-muted rounded-full">
            <FileQuestion className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Page Not Found</h1>
            <p className="text-sm text-muted-foreground">
              We couldn't find the page you're looking for. It might have been moved, deleted, or
              never existed.
            </p>
          </div>
          <Link to="/" className={buttonVariants({ className: "w-full" })}>
            Return Home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
