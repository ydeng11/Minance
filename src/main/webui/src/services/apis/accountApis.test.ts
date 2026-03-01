import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  createAccount,
  fetchAccounts,
  fetchAccountsByBank,
} from './accountApis';
import { server } from '@/test/server';
import type { Account } from './types';

const buildAccount = (overrides: Partial<Account> = {}): Account => ({
  accountId: 1,
  bankId: 1,
  bankName: 'CHASE',
  accountName: 'Travel Rewards',
  accountType: 'CREDIT',
  initBalance: 1000,
  ...overrides,
});

describe('accountApis', () => {
  it('creates an account and returns the persisted payload', async () => {
    const payload = buildAccount({ accountId: undefined });
    server.use(
      http.post('/1.0/minance/account/create', async ({ request }) => {
        const body = (await request.json()) as Account;
        return HttpResponse.json({ ...body, accountId: 42 });
      }),
    );

    const created = await createAccount(payload);
    expect(created.accountId).toBe(42);
    expect(created.bankName).toBe(payload.bankName);
  });

  it('surfaces descriptive errors when the API rejects the request', async () => {
    server.use(
      http.post('/1.0/minance/account/create', () =>
        HttpResponse.json({ message: 'invalid payload' }, { status: 400 }),
      ),
    );

    await expect(createAccount(buildAccount())).rejects.toThrow(
      /invalid payload/i,
    );
  });

  it('retrieves lists of accounts and filters by bank', async () => {
    const accounts = [
      buildAccount({ accountId: 1, bankName: 'CHASE' }),
      buildAccount({ accountId: 2, bankName: 'CITI' }),
    ];

    server.use(
      http.get('/1.0/minance/account/listAll', () =>
        HttpResponse.json(accounts),
      ),
      http.get('/1.0/minance/account/listAccountsForBank', ({ request }) => {
        const url = new URL(request.url);
        const bank = url.searchParams.get('bank-name');
        const filtered = accounts.filter(
          (account) => account.bankName === bank,
        );
        return HttpResponse.json(filtered);
      }),
    );

    const allAccounts = await fetchAccounts();
    expect(allAccounts).toHaveLength(2);

    const chaseAccounts = await fetchAccountsByBank('CHASE');
    expect(chaseAccounts).toHaveLength(1);
    expect(chaseAccounts[0].bankName).toBe('CHASE');
  });
});
