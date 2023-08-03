package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class BankAccountCsvFactoryImplTest {
  @Inject
  BankAccountCsvFactory<BankAccountCsvTemplate> bankAccountCsvFactory;

  @Test
  void checkChaseCredit_CsvParse() {
    BankAccountPair bankAccountPair =
        BankAccountPair.of(BankAccountPair.BankName.CHASE, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/chase_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
        new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
            .withType(template.getClass())
            .withSeparator(',')
            .withIgnoreLeadingWhiteSpace(true)
            .withIgnoreEmptyLine(true)
            .build();

    List<? extends BankAccountCsvTemplate> chaseTransactions = csvReader.parse();
    assertThat(chaseTransactions.size(),
        equalTo(8));

    assertThat(chaseTransactions.get(0).toString(), equalTo(
        "ChaseCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=CHASE, accountType=CREDIT},"
            + " amount=-12.59, category='Entertainment', description='GOOGLE *YouTubePremium', transactionType='Sale', "
            + "transactionDate=2011-03-14, postDate=2011-03-14, memo=''}"));
  }

  @Test
  void checkDiscoverCredit_CsvParse() {
    BankAccountPair bankAccountPair =
        BankAccountPair.of(BankAccountPair.BankName.DISCOVER, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/discover_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
        new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
            .withType(template.getClass())
            .withSeparator(',')
            .withIgnoreLeadingWhiteSpace(true)
            .withIgnoreEmptyLine(true)
            .build();

    List<? extends BankAccountCsvTemplate> chaseTransactions = csvReader.parse();
    assertThat(chaseTransactions.size(),
        equalTo(8));

    assertThat(chaseTransactions.get(0).toString(), equalTo(
        "DiscoverCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=DISCOVER, accountType=CREDIT},"
            + " amount=294.64, category='Restaurants', description='DRAGON CITY', "
            + "transactionDate=1999-04-09, postDate=1999-04-09}"));
  }
}
