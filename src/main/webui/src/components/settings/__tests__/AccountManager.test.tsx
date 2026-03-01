import React from "react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccountManager } from "../AccountManager";

const mockUseAccountsQuery = vi.fn();
const mockUseAccountMutation = vi.fn();
const mockUseBankAndAccountTypeQuery = vi.fn();
const createAccountMutation = vi.fn();

vi.mock("@/services/queries/useAccountQueries", () => ({
    useAccountsQuery: () => mockUseAccountsQuery(),
}));

vi.mock("@/services/queries/useAccountMutation", () => ({
    useAccountMutation: () => ({
        createAccountMutation,
        updateAccountMutation: vi.fn(),
        deleteAccountMutation: vi.fn(),
    }),
}));

vi.mock("@/services/queries/useBankAndAccountTypeQuery", () => ({
    useBankAndAccountTypeQuery: () => mockUseBankAndAccountTypeQuery(),
}));

const mockFormValues = {
    bankName: "CHASE",
    accountName: "Travel Card",
    accountType: "CREDIT",
    initBalance: 100,
};

const accountFormSubmit = vi.fn();

vi.mock("../AccountForm", () => ({
    AccountForm: (props: { onSubmit: (values: typeof mockFormValues) => void }) => {
        accountFormSubmit.mockImplementation(() => props.onSubmit(mockFormValues));
        return (
            <div data-testid="account-form-mock">
                <button onClick={() => accountFormSubmit()}>Submit Mock</button>
            </div>
        );
    },
}));

describe("AccountManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAccountsQuery.mockReturnValue({
            data: [
                {
                    accountId: 1,
                    bankId: 1,
                    bankName: "CHASE",
                    accountName: "Peach's Unlimited",
                    accountType: "CREDIT",
                    initBalance: 0,
                },
            ],
            isLoading: false,
            isError: false,
        });
        mockUseBankAndAccountTypeQuery.mockReturnValue({
            supportedBanks: { data: ["CHASE"] },
            supportedAccountTypes: { data: ["CREDIT"] },
            isLoading: false,
            isError: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("renders a skeleton placeholder while accounts load", () => {
        mockUseAccountsQuery.mockReturnValueOnce({
            data: [],
            isLoading: true,
            isError: false,
        });

        render(<AccountManager />);
        expect(screen.getByTestId("accounts-skeleton")).toBeInTheDocument();
    });

    it("shows an inline error message when the accounts query fails", () => {
        mockUseAccountsQuery.mockReturnValueOnce({
            data: [],
            isLoading: false,
            isError: true,
            error: new Error("boom"),
        });

        render(<AccountManager />);
        expect(screen.getByText(/unable to load accounts/i)).toBeVisible();
    });

    it("submits new accounts via the create mutation when the dialog form saves", () => {
        render(<AccountManager />);

        fireEvent.click(screen.getByRole("button", { name: /add new account/i }));
        expect(screen.getByTestId("account-form-mock")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /submit mock/i }));
        // The buildAccountPayload function adds accountId and bankId fields
        expect(createAccountMutation).toHaveBeenCalledWith({
            accountId: 0,
            bankId: 0,
            ...mockFormValues,
        });
    });
});
