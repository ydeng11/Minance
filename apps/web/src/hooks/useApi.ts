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
  recurringsApi,
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
        addCredential: aiApi.addCredential.bind(null, request),
        rotateCredential: aiApi.rotateCredential.bind(null, request),
        deleteCredential: aiApi.deleteCredential.bind(null, request),
        savePreferences: aiApi.savePreferences.bind(null, request)
      },
      system: {
        storage: () => systemApi.storage(request),
        listBackups: () => systemApi.listBackups(request),
        createBackup: () => systemApi.createBackup(request),
        importBackupArchive: systemApi.importBackupArchive.bind(null, request),
        exportBackupArchive: systemApi.exportBackupArchive.bind(null, request),
        restoreBackup: systemApi.restoreBackup.bind(null, request)
      },
      analytics: {
        overview: analyticsApi.overview.bind(null, request),
        explorer: analyticsApi.explorer.bind(null, request),
        categories: analyticsApi.categories.bind(null, request),
        merchants: analyticsApi.merchants.bind(null, request),
        heatmap: analyticsApi.heatmap.bind(null, request),
        anomalies: analyticsApi.anomalies.bind(null, request)
      },
      assistant: {
        ask: assistantApi.ask.bind(null, request),
        createConversation: assistantApi.createConversation.bind(null, request),
        askInConversation: assistantApi.askInConversation.bind(null, request)
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
        updateProcessedRows: importsApi.updateProcessedRows.bind(null, request),
        getReconciliation: importsApi.getReconciliation.bind(null, request),
        resolveReconciliation: importsApi.resolveReconciliation.bind(null, request),
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
        bulkUpdate: transactionsApi.bulkUpdate.bind(null, request),
        update: transactionsApi.update.bind(null, request),
        remove: transactionsApi.remove.bind(null, request),
        restore: transactionsApi.restore.bind(null, request)
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
      recurrings: {
        list: recurringsApi.list.bind(null, request),
        getById: recurringsApi.getById.bind(null, request),
        create: recurringsApi.create.bind(null, request),
        update: recurringsApi.update.bind(null, request),
        evaluate: recurringsApi.evaluate.bind(null, request),
        pause: recurringsApi.pause.bind(null, request),
        resume: recurringsApi.resume.bind(null, request),
        archive: recurringsApi.archive.bind(null, request),
        remove: recurringsApi.remove.bind(null, request),
        getSuggestions: recurringsApi.getSuggestions.bind(null, request),
        dismissSuggestion: recurringsApi.dismissSuggestion.bind(null, request),
        createRuleFromSuggestion: recurringsApi.createRuleFromSuggestion.bind(null, request)
      },
      savedViews: {
        list: () => savedViewsApi.list(request),
        create: savedViewsApi.create.bind(null, request),
        update: savedViewsApi.update.bind(null, request),
        remove: savedViewsApi.remove.bind(null, request)
      }
    }),
    [request]
  );
}
