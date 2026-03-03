"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/session";
import {
  accountsApi,
  aiApi,
  analyticsApi,
  assistantApi,
  categoriesApi,
  importsApi,
  investmentsApi,
  migrationApi,
  savedViewsApi,
  systemApi,
  transactionsApi
} from "@/lib/api/endpoints";

export function useApi() {
  const { request } = useSession();

  return useMemo(
    () => ({
      ai: {
        providers: () => aiApi.providers(request),
        credentials: () => aiApi.credentials(request),
        trainingStatus: () => aiApi.trainingStatus(request),
        addCredential: aiApi.addCredential.bind(null, request),
        rotateCredential: aiApi.rotateCredential.bind(null, request),
        deleteCredential: aiApi.deleteCredential.bind(null, request),
        savePreferences: aiApi.savePreferences.bind(null, request)
      },
      system: {
        storage: () => systemApi.storage(request)
      },
      analytics: {
        overview: analyticsApi.overview.bind(null, request),
        categories: analyticsApi.categories.bind(null, request),
        merchants: analyticsApi.merchants.bind(null, request),
        heatmap: analyticsApi.heatmap.bind(null, request),
        anomalies: analyticsApi.anomalies.bind(null, request)
      },
      assistant: {
        ask: assistantApi.ask.bind(null, request)
      },
      categories: {
        list: () => categoriesApi.list(request),
        getStrategy: () => categoriesApi.getStrategy(request),
        saveStrategy: categoriesApi.saveStrategy.bind(null, request),
        add: categoriesApi.add.bind(null, request),
        update: categoriesApi.update.bind(null, request),
        remove: categoriesApi.remove.bind(null, request),
        addRule: categoriesApi.addRule.bind(null, request)
      },
      imports: {
        create: importsApi.create.bind(null, request),
        list: () => importsApi.list(request),
        getById: importsApi.getById.bind(null, request),
        saveMapping: importsApi.saveMapping.bind(null, request),
        listProcessedRows: importsApi.listProcessedRows.bind(null, request),
        updateProcessedRow: importsApi.updateProcessedRow.bind(null, request),
        reprocess: importsApi.reprocess.bind(null, request),
        commit: importsApi.commit.bind(null, request)
      },
      accounts: {
        listProviders: () => accountsApi.listProviders(request),
        getProvider: accountsApi.getProvider.bind(null, request),
        createLinkSession: accountsApi.createLinkSession.bind(null, request),
        supportedAccountTypes: () => accountsApi.supportedAccountTypes(request),
        list: () => accountsApi.list(request),
        create: accountsApi.create.bind(null, request),
        update: accountsApi.update.bind(null, request),
        updateSettings: accountsApi.updateSettings.bind(null, request),
        remove: accountsApi.remove.bind(null, request)
      },
      transactions: {
        list: transactionsApi.list.bind(null, request),
        create: transactionsApi.create.bind(null, request),
        update: transactionsApi.update.bind(null, request),
        remove: transactionsApi.remove.bind(null, request)
      },
      investments: {
        overview: investmentsApi.overview.bind(null, request),
        holdings: () => investmentsApi.holdings(request),
        createHolding: investmentsApi.createHolding.bind(null, request),
        importCsv: investmentsApi.importCsv.bind(null, request),
        positions: investmentsApi.positions.bind(null, request),
        accounts: () => investmentsApi.accounts(request),
        performance: investmentsApi.performance.bind(null, request)
      },
      savedViews: {
        list: () => savedViewsApi.list(request),
        create: savedViewsApi.create.bind(null, request),
        remove: savedViewsApi.remove.bind(null, request)
      },
      migration: {
        run: migrationApi.run.bind(null, request)
      }
    }),
    [request]
  );
}
