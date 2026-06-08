"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type PageName =
  | "invite"
  | "register"
  | "login"
  | "groups"
  | "group-detail"
  | "admin-products"
  | "product-form"
  | "admin-groups"
  | "group-form"
  | "admin-networks"
  | "admin-users"
  | "invite-codes"
  | "stats";

export type RouteParams = Record<string, string | number>;

interface RouterContextType {
  currentPage: PageName;
  routeParams: RouteParams;
  navigate: (page: PageName, params?: RouteParams) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function useRouterContext(): RouterContextType {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouterContext must be used within RouterProvider");
  }
  return ctx;
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageName>("invite");
  const [routeParams, setRouteParams] = useState<RouteParams>({});

  const navigate = useCallback((page: PageName, params?: RouteParams) => {
    setCurrentPage(page);
    setRouteParams(params ?? {});
  }, []);

  return (
    <RouterContext.Provider value={{ currentPage, routeParams, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}
