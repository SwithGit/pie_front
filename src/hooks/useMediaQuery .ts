import { useState, useEffect } from "react";

const getMatches = (query: string) => {
  if (typeof window !== "undefined") {
    return window.matchMedia(query).matches;
  }
  return false;
};

function useMediaQuery(query: string) {
  const [isMatched, setIsMatched] = useState(getMatches(query));

  useEffect(() => {
    const matchMediaList = window.matchMedia(query);
    const handleChange = () => {
      setIsMatched(getMatches(query));
    };

    handleChange();
    matchMediaList.addEventListener("change", handleChange);

    return () => {
      matchMediaList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return isMatched;
}

export default useMediaQuery;
