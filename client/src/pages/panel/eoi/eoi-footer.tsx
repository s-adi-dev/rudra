import { GetEoisResponse } from "@/store/eoi";

interface EoiFooterProps {
  data: GetEoisResponse;
}

export const EoiFooter = ({ data }: EoiFooterProps) => {
  return (
    <div className="mt-4 flex justify-around items-center gap-3 flex-wrap-reverse md:justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {data.data.length} of {data.totalEois} EOIs
      </div>
    </div>
  );
};
