import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GetEoisResponse } from "@/store/eoi";
import { FilterX } from "lucide-react";
import { EoiFilter } from "./eoi-filter";

interface EoiHeaderProps {
  isFiltered: boolean;
  setIsFiltered: (state: boolean) => void;
  searchInput: string;
  eoiNoSearch: string;
  data?: GetEoisResponse;
  handleSearch: (value: string) => void;
  handleEoiNoSearch: (value: string) => void;
  handleClearFilter: () => void;
  handlePageChange: (page: number) => void;
}

export const EoiHeader = ({
  isFiltered,
  setIsFiltered,
  searchInput,
  eoiNoSearch,
  data,
  handleSearch,
  handleEoiNoSearch,
  handleClearFilter,
  handlePageChange,
}: EoiHeaderProps) => {
  return (
    <div className="w-full flex flex-wrap gap-3 items-center justify-around md:justify-between mb-3">
      <div className="flex gap-3 sm:gap-2 justify-around flex-wrap sm:flex-nowrap sm:justify-start">
        {/* General search input */}
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search..."
          className="sm:max-w-64"
        />

        {/* EOI Number search */}
        <Input
          type="number"
          value={eoiNoSearch}
          onChange={(e) => handleEoiNoSearch(e.target.value)}
          placeholder="EOI Number..."
          className="sm:max-w-44"
        />

        <span className="flex gap-2">
          {/* Additional filters */}
          <EoiFilter
            clearFilter={handleClearFilter}
            setIsFiltered={setIsFiltered}
          />

          {/* Clear filters button */}
          {isFiltered && (
            <Tooltip content="Clear filter">
              <Button
                className="flex-shrink-0"
                onClick={handleClearFilter}
                variant="outline"
                size="icon"
                aria-label="Clear filters"
              >
                <FilterX size={20} />
              </Button>
            </Tooltip>
          )}
        </span>
      </div>

      {/* Pagination controls */}
      {data && (
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={data.currentPage <= 1}
            onClick={() => handlePageChange(data.currentPage - 1)}
          >
            Previous
          </Button>

          <span className="px-2 text-sm whitespace-nowrap">
            Page {data.currentPage} of {data.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={data.currentPage >= data.totalPages}
            onClick={() => handlePageChange(data.currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
