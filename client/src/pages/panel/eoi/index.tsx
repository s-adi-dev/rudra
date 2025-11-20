import { CenterWrapper } from "@/components/custom ui/center-page";
import ErrorCard from "@/components/custom ui/error-display";
import { Loader } from "@/components/custom ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBreadcrumb, useBreadcrumbStore } from "@/hooks/use-breadcrumb";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/store/auth";
import { useEois, useEoiStore } from "@/store/eoi";
import { CustomAxiosError } from "@/utils/types/axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EoiFooter } from "./eoi-footer";
import { EoiHeader } from "./eoi-header";
import { EoiTable } from "./eoi-table";

const EoiList = () => {
  // Hooks
  const { filters, setFilters, resetFilters, setSelectedEoiId } = useEoiStore();
  const navigate = useNavigate();
  const { pageno } = useParams<{ pageno: string }>();
  const PageNo = Number(pageno) ? Number(pageno) : 1;
  const [isFiltered, setIsFiltered] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [eoiNoSearch, setEoiNoSearch] = useState("");

  const { setBreadcrumbs } = useBreadcrumb();
  const { setBreadcrumbItems } = useBreadcrumbStore();
  const { useEoisList } = useEois();
  const { data, isLoading, error } = useEoisList(filters);
  const { logout: handleLogout } = useAuth(true);

  const debouncedSetSearch = useDebounce((value: string) => {
    setFilters({ search: value, page: 1 });
  }, 600);

  const debouncedSetEoiNo = useDebounce((value: string) => {
    setFilters({ eoiNo: value ? Number(value) : undefined, page: 1 });
  }, 600);

  // Event Handlers
  const handleClearFilter = () => {
    setSearchInput("");
    setEoiNoSearch("");
    resetFilters();
    setIsFiltered(false);
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    debouncedSetSearch(value);
    setIsFiltered(!!value || !!eoiNoSearch);
  };

  const handleEoiNoSearch = (value: string) => {
    setEoiNoSearch(value);
    debouncedSetEoiNo(value);
    setIsFiltered(!!value || !!searchInput);
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
    navigate(`/panel/eoi/${newPage}`);
  };

  const handleOpenDetails = (id: string) => {
    navigate(`form/${id}`);
    setSelectedEoiId(id);
  };

  // useEffects
  useEffect(() => {
    setBreadcrumbs([{ label: "EOI List" }]);
    setBreadcrumbItems(undefined);
  }, [setBreadcrumbs, setBreadcrumbItems]);

  useEffect(() => {
    handlePageChange(PageNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PageNo]);

  // JSX Part
  if (isLoading) {
    return (
      <CenterWrapper>
        <Loader />
      </CenterWrapper>
    );
  }

  if (error) {
    const { response, message } = (error as CustomAxiosError) || {};
    let errMsg = response?.data.error ?? message;

    if (errMsg === "Access denied. No token provided") {
      errMsg = "Access denied. No token provided please login again";
    } else if (errMsg === "Network Error") {
      errMsg =
        "Connection issue detected. Please check your internet or try again later.";
    }

    return (
      <CenterWrapper className="px-2 gap-2 text-center">
        <ErrorCard
          title="Error occurred"
          description={errMsg || "An unknown error occurred"}
          btnTitle="Go to Login"
          onAction={handleLogout}
        />
      </CenterWrapper>
    );
  }

  return (
    <Card className="w-[90svw] lg:w-[95svw] xl:w-full">
      <CardHeader>
        <CardTitle>EOI List</CardTitle>
      </CardHeader>
      <CardContent>
        <EoiHeader
          isFiltered={isFiltered}
          setIsFiltered={setIsFiltered}
          searchInput={searchInput}
          eoiNoSearch={eoiNoSearch}
          handleSearch={handleSearch}
          handleEoiNoSearch={handleEoiNoSearch}
          handleClearFilter={handleClearFilter}
          data={data}
          handlePageChange={handlePageChange}
        />

        <EoiTable data={data} openDetails={handleOpenDetails} />

        {data && <EoiFooter data={data} />}
      </CardContent>
    </Card>
  );
};

export default EoiList;
