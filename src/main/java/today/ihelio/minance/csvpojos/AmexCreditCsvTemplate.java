package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;
import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.AMEX;

@Dependent
public class AmexCreditCsvTemplate implements BankAccountCsvTemplate {
    @CsvIgnore
    public final BankAccountPair bankAccountPair =
            BankAccountPair.of(AMEX, CREDIT);

    @CsvBindByName(column = "Amount")
    public double amount;

    @CsvBindByName(column = "Category")
    public String category;

    @CsvBindByName(column = "Description")
    public String description;
//    @CsvBindByName(column = "Extended Details")
//    public String extendedDetails;

    @CsvDate(value = "MM/dd/yyyy")
    @CsvBindByName(column = "Date")
    public LocalDate date;

//    @CsvBindByName(column = "Appears On Your Statement As")
//    public String appearsOnYourStatementAs;

    @CsvBindByName(column = "Address")
    public String address;

    @CsvBindByName(column = "City/State")
    public String cityZip;

    @CsvBindByName(column = "Zip Code")
    public String state;

    @CsvBindByName(column = "Country")
    public String country;

    @CsvBindByName(column = "Reference")
    public String reference;

    public AmexCreditCsvTemplate() {
    }

    @Override
    public BankAccountPair getBankAccount() {
        return bankAccountPair;
    }

    @Override public String toString() {
        return "AmexCreditCsvTemplate{" +
                "bankAccountPair=" + bankAccountPair +
                ", amount=" + amount +
                ", category='" + category + '\'' +
                ", description='" + description + '\'' +
                //", extendedDetails='" + extendedDetails + '\'' +
                ", date=" + date +
                //", appearsOnYourStatementAs=" + appearsOnYourStatementAs + '\'' +
                ", address='" + address + '\'' +
                ", cityZip='" + cityZip + '\'' +
                ", state='" + state + '\'' +
                ", country='" + country + '\'' +
                ", reference='" + reference + '\'' +
                '}';
    }
}