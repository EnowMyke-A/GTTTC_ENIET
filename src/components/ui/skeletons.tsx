import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Base skeleton with shimmer animation
export const SkeletonBase = ({ className = "" }: { className?: string }) => (
  <Skeleton className={`animate-pulse bg-muted ${className}`} />
);

// Page Header Skeleton
export const PageHeaderSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-8 w-48 bg-muted" />
    <Skeleton className="h-4 w-64 bg-muted" />
  </div>
);

// Stats Card Skeleton (for dashboard cards)
export const StatsCardSkeleton = () => (
  <Card className="hover:bg-muted bg-muted/90 border-0">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24 bg-muted" />
      <Skeleton className="h-10 w-10 rounded-full bg-accent" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-2 bg-muted" />
      <Skeleton className="h-3 w-32 bg-muted" />
    </CardContent>
  </Card>
);

// Filter Card Skeleton (for filter sections)
export const FilterCardSkeleton = () => (
  <Card className="shadow-none pt-6">
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20 bg-muted" />
            <Skeleton className="h-10 w-full rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Data Card Skeleton (for course cards, student cards, etc.)
export const DataCardSkeleton = () => (
  <Card className="shadow-0 relative pb-12">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full bg-muted" />
        <Skeleton className="h-6 w-32 bg-muted" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full bg-muted" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-md bg-muted" />
        <Skeleton className="h-6 w-20 rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-md bg-muted" />
        <Skeleton className="h-6 w-16 rounded-md bg-muted" />
      </div>
      <div className="flex gap-2 mt-4 absolute bottom-6 left-6 w-[calc(100%-3rem)]">
        <Skeleton className="h-8 flex-1 rounded-md bg-muted" />
        <Skeleton className="h-8 flex-1 rounded-md bg-muted" />
      </div>
    </CardContent>
  </Card>
);

// Table Skeleton (for data tables)
export const TableSkeleton = ({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) => (
  <Card className="shadow-none">
    <CardHeader>
      <Skeleton className="h-6 w-48 bg-muted" />
      <Skeleton className="h-4 w-64 bg-muted mt-2" />
    </CardHeader>
    <CardContent>
      {/* Search and filters */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 flex-1 rounded-md bg-muted" />
        <Skeleton className="h-10 w-32 rounded-md bg-muted" />
      </div>

      {/* Table */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex gap-4 bg-muted/50 p-3 rounded-md">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 bg-muted" />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1 bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Form Card Skeleton (for forms with inputs)
export const FormCardSkeleton = () => (
  <Card className="shadow-none">
    <CardHeader>
      <Skeleton className="h-6 w-40 bg-muted" />
      <Skeleton className="h-4 w-56 bg-muted mt-2" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-10 w-full rounded-md bg-muted" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-md bg-primary/20 mt-6" />
    </CardContent>
  </Card>
);

// List Item Skeleton (for notification lists, etc.)
export const ListItemSkeleton = () => (
  <div className="flex items-start gap-4 p-4 border-b">
    <Skeleton className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4 bg-muted" />
      <Skeleton className="h-3 w-full bg-muted" />
      <Skeleton className="h-3 w-1/2 bg-muted" />
    </div>
    <Skeleton className="h-6 w-16 rounded-md bg-muted" />
  </div>
);

// Grid Skeleton (for card grids)
export const GridSkeleton = ({ 
  items = 6, 
  CardComponent = DataCardSkeleton 
}: { 
  items?: number; 
  CardComponent?: React.ComponentType;
}) => (
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: items }).map((_, i) => (
      <CardComponent key={i} />
    ))}
  </div>
);

// Dashboard Layout Skeleton
export const DashboardSkeleton = () => (
  <div className="md:p-4 space-y-6">
    <PageHeaderSkeleton />
    
    {/* Stats Cards */}
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Content Cards */}
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-muted" />
          <Skeleton className="h-4 w-48 bg-muted mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md bg-muted" />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-muted" />
          <Skeleton className="h-4 w-48 bg-muted mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

// Marks Table Skeleton (specialized for marks page)
export const MarksTableSkeleton = () => (
  <div className="p-4 space-y-6">
    <PageHeaderSkeleton />
    <FilterCardSkeleton />
    
    <Card className="shadow-none">
      <CardHeader>
        <Skeleton className="h-6 w-48 bg-muted" />
        <Skeleton className="h-4 w-64 bg-muted mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1 rounded-md bg-muted" />
          <Skeleton className="h-10 w-24 rounded-md bg-muted" />
        </div>

        <div className="overflow-x-auto">
          <div className="space-y-2">
            {/* Table Header */}
            <div className="flex gap-4 bg-muted/50 p-3 rounded-md">
              {['Student Name', 'Test', 'Exam', 'Average', 'Weighted', 'Grade'].map((header, i) => (
                <Skeleton key={i} className="h-4 w-24 bg-muted" />
              ))}
            </div>

            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-3 hover:bg-muted/30 rounded-md">
                <Skeleton className="h-4 w-32 bg-muted" />
                <Skeleton className="h-8 w-20 rounded-md bg-muted" />
                <Skeleton className="h-8 w-20 rounded-md bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted" />
                <Skeleton className="h-6 w-12 rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
