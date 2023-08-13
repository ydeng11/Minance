package today.ihelio.minance.csvpojos;

import com.opencsv.CSVReader;
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

    List<? extends BankAccountCsvTemplate> discoverTransactions = csvReader.parse();
    assertThat(discoverTransactions.size(),
            equalTo(8));

    assertThat(discoverTransactions.get(0).toString(), equalTo(
            "DiscoverCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=DISCOVER, accountType=CREDIT},"
                    + " amount=294.64, category='Restaurants', description='DRAGON CITY', "
                    + "transactionDate=1999-04-09, postDate=1999-04-09}"));
  }

  @Test
  void checkBoaCredit_CsvParse() {
    BankAccountPair bankAccountPair =
            BankAccountPair.of(BankAccountPair.BankName.BANK_OF_AMERICA, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/boa_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
            new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
                    .withType(template.getClass())
                    .withSeparator(',')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withIgnoreEmptyLine(true)
                    .build();

    List<? extends BankAccountCsvTemplate> boaTransactions = csvReader.parse();
    assertThat(boaTransactions.size(),
            equalTo(8));

    assertThat(boaTransactions.get(0).toString(), equalTo(
            "BoaCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=BANK_OF_AMERICA, accountType=CREDIT},"
                    + " amount=-14.84, description='Amazon.com*T638W6VB0 Amzn.com/billWA', "
                    + "postDate=2023-07-25, address='Amzn.com/bill WA', referenceNumber='24692163206109402682751'}"));
  }

  @Test
  void checkBoaDebit_CsvParse() {
    BankAccountPair bankAccountPair =
            BankAccountPair.of(BankAccountPair.BankName.BANK_OF_AMERICA, BankAccountPair.AccountType.DEBIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/boa_debit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
            new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
                    .withType(template.getClass())
                    .withSeparator(',')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withIgnoreEmptyLine(true)
                    .build();

    List<? extends BankAccountCsvTemplate> boaTransactions = csvReader.parse();
    assertThat(boaTransactions.size(),
            equalTo(8));

    assertThat(boaTransactions.get(0).toString(), equalTo(
            "BoaDebitCsvTemplate{bankAccountPair=BankAccountPair{bankName=BANK_OF_AMERICA, accountType=DEBIT},"
                    + " amount=-123.0, balance=4339.85, description='SYNCHRONY BANK DES:PAYMENT ID:XXXXXXXXXX91291 INDN:DENG,YUJUN CO ID:XXXXX37262 WEB', "
                    + "date=2023-06-29}"));
  }

  @Test
  void checkAmexCredit_CsvParse() {
    BankAccountPair bankAccountPair =
            BankAccountPair.of(BankAccountPair.BankName.AMEX, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/amex_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
            new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
                    .withType(template.getClass())
                    .withSeparator(',')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withIgnoreEmptyLine(true)
                    .build();

    List<? extends BankAccountCsvTemplate> amexTransactions = csvReader.parse();
    assertThat(amexTransactions.size(),
            equalTo(8));

    assertThat(amexTransactions.get(0).toString(), equalTo(
            "AmexCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=AMEX, accountType=CREDIT},"
                    + " amount=52.52, category='Merchandise & Supplies-Groceries', description='SUNRISE MANAGEMENT ISUNRISE             FL', date=2023-07-23, "
                    + "address='10065 SUNSET STRIP', cityZip='SUNRISE\n33322', state='FL', country='UNITED STATES', reference='320232050613472558'}"));
  }

  @Test
  void checkCitiCredit_CsvParse() {
    BankAccountPair bankAccountPair =
            BankAccountPair.of(BankAccountPair.BankName.CITI, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/citi_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
            new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
                    .withType(template.getClass())
                    .withSeparator(',')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withIgnoreEmptyLine(true)
                    .build();

    List<? extends BankAccountCsvTemplate> citiTransactions = csvReader.parse();
    assertThat(citiTransactions.size(),
            equalTo(8));

    assertThat(citiTransactions.get(0).toString(), equalTo(
            "CitiCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=CITI, accountType=CREDIT},"
                    + " debit=0.0, credit=-371.77, description='AUTOPAY 000000000007557RAUTOPAY AUTO-PMT', "
                    + "date=2023-05-09, status='Cleared', memberName='YUJUN DENG'}"));
  }

  @Test
  void checkAppleCredit_CsvParse() {
    BankAccountPair bankAccountPair =
            BankAccountPair.of(BankAccountPair.BankName.APPLE, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/apple_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
            new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
                    .withType(template.getClass())
                    .withSeparator(',')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withIgnoreEmptyLine(true)
                    .build();

    List<? extends BankAccountCsvTemplate> appleTransactions = csvReader.parse();
    assertThat(appleTransactions.size(),
            equalTo(8));

    assertThat(appleTransactions.get(0).toString(), equalTo(
            "AppleCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=APPLE, accountType=CREDIT},"
                    + " amount=120.0, category='Restaurants', transactionType='Purchase', description='CY CHINESE RESTAURANT 1242 NE 163RD ST NORTH MIAMI B33162 FL USA', merchant='CY Chinese Restaurant', "
                    + "transactionDate=2023-07-30, clearingDate=2023-07-31, memberName='Yujun Deng'}"));
  }

  @Test
  void checkCashAppCredit_CsvParse() {
    BankAccountPair bankAccountPair =
            BankAccountPair.of(BankAccountPair.BankName.CASH_APP, BankAccountPair.AccountType.CREDIT);
    ClassLoader classLoader = BankAccountCsvFactoryImplTest.class.getClassLoader();
    InputStream file = classLoader.getResourceAsStream("testCsv/cash_app_credit.csv");

    Reader reader = new InputStreamReader(file);

    BankAccountCsvTemplate template = bankAccountCsvFactory.get(bankAccountPair);

    CsvToBean<BankAccountCsvTemplate> csvReader =
            new CsvToBeanBuilder<BankAccountCsvTemplate>(reader)
                    .withType(template.getClass())
                    .withSeparator(',')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withIgnoreEmptyLine(true)
                    .build();

    List<? extends BankAccountCsvTemplate> cashAppTransactions = csvReader.parse();
    assertThat(cashAppTransactions.size(),
            equalTo(8));

    assertThat(cashAppTransactions.get(0).toString(), equalTo(
            "CashAppCreditCsvTemplate{bankAccountPair=BankAccountPair{bankName=CASH_APP, accountType=CREDIT},"
                    + " currency='USD', amount=7.06, fee=0.0, netAmount=7.06, assetType='BTC', assetPrice=26358.04, assetAmount=0.00026785, "
                    + "status='COMPLETED', transactionId='atqvua', date=2023-06-07, notes='#boost sale of USD 7.06', senderOrReceiver='', account='Your Cash'}"));
  }
}

