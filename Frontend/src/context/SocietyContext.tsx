import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getSociety } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import type { PublicSociety } from "@/types/public.types";

interface SocietyContextValue {
  society: PublicSociety | null;
  loading: boolean;
  notFound: boolean;
}

const SocietyContext = createContext<SocietyContextValue | undefined>(undefined);

export function SocietyProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams();
  const [society, setSociety] = useState<PublicSociety | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setSociety(null);

    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    getSociety(slug)
      .then((s) => {
        if (active) setSociety(s);
      })
      .catch((err) => {
        if (!active) return;
        const msg = getErrorMessage(err);
        if (msg.toLowerCase().includes("not found")) {
          setNotFound(true);
        } else {
          toast.error(msg);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <SocietyContext.Provider value={{ society, loading, notFound }}>
      {children}
    </SocietyContext.Provider>
  );
}

export const useSociety = (): SocietyContextValue => {
  const ctx = useContext(SocietyContext);
  if (!ctx) throw new Error("useSociety must be used within SocietyProvider");
  return ctx;
};