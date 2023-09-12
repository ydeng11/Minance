package today.ihelio.minance.service;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import today.ihelio.jooq.tables.pojos.Accounts;
import today.ihelio.minance.exception.CustomException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CITI;

@QuarkusTest
public class AccountServiceTest {
  @Inject AccountService accountService;
  @Inject BankService bankService;

  @Test public void testAccountService_createAccount_illegalBank() throws Exception {
    Accounts accounts = new Accounts();
    accounts.setAccountName("test");
    accounts.setBankName("citi");
    accounts.setAccountType("credit");
    accounts.setInitBalance(BigDecimal.valueOf(127.10));

    assertThatThrownBy(() -> accountService.create(accounts)).isInstanceOf(CustomException.class)
        .hasCauseInstanceOf(
            IllegalArgumentException.class)
        .hasMessageContaining("citi is not allowed!");
  }

  @Test public void testAccountService_createAccount_bankNotExisting() throws Exception {
    Accounts accounts = new Accounts();
    accounts.setAccountName("test");
    accounts.setBankName("invalid");
    accounts.setAccountType("CREDIT");
    accounts.setInitBalance(BigDecimal.valueOf(127.10));

    assertThatThrownBy(() -> accountService.create(accounts)).isInstanceOf(CustomException.class)
        .hasCauseInstanceOf(
            IllegalArgumentException.class)
        .hasMessageContaining("invalid is not allowed!");
  }

  @Test public void testAccountService_createUpdateDeleteAccount_legalBank() throws Exception {
    Accounts accounts = new Accounts();
    accounts.setAccountName("test");
    accounts.setBankName("CITI");
    accounts.setAccountType("CREDIT");
    BigDecimal balance = new BigDecimal("123.12");
    accounts.setInitBalance(balance);
    bankService.create(CITI);
    accountService.create(accounts);
    assertThat(accountService.retrieveAccountsByBank(CITI).size()).isEqualTo(1);
    Accounts newAccounts = accountService.retrieveAccountsByBank(CITI).get(0);
    assertThat(newAccounts.getAccountName()).isEqualTo(
        "test");
    assertThat(newAccounts.getInitBalance()).isEqualTo(
        balance);

    BigDecimal newBalance = new BigDecimal("999.12");
    newAccounts.setInitBalance(newBalance);

    accountService.update(newAccounts);
    assertThat(accountService.retrieveAccountsByBank(CITI).get(0).getInitBalance()).isEqualTo(
        newBalance);

    assertThat(accountService.retrieveAll().size()).isEqualTo(1);

    accountService.delete(newAccounts.getAccountId());
    assertThat(accountService.retrieveAll().size()).isEqualTo(0);
  }
}
