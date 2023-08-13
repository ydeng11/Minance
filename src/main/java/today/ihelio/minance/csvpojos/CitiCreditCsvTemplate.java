package today.ihelio.minance.csvpojos;

import com.opencsv.bean.CsvBindByName;
import com.opencsv.bean.CsvDate;
import com.opencsv.bean.CsvIgnore;
import jakarta.enterprise.context.Dependent;

import java.time.LocalDate;

import static today.ihelio.minance.csvpojos.BankAccountPair.AccountType.CREDIT;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CITI;

@Dependent
public class CitiCreditCsvTemplate implements BankAccountCsvTemplate {
    @CsvIgnore
    public final BankAccountPair bankAccountPair =
            BankAccountPair.of(CITI,CREDIT);
    @CsvBindByName(column = "Debit")
    public double debit;

    @CsvBindByName(column = "Credit")
    public double credit;

    @CsvBindByName(column = "Description")
    public String description;

    @CsvDate(value = "MM/dd/yyyy")
    @CsvBindByName(column = "Date")
    public LocalDate date;

    @CsvBindByName(column = "Status")
    public String status;

    @CsvBindByName(column = "Member Name")
    public String memberName;

    public CitiCreditCsvTemplate() {
    }
    @Override
    public BankAccountPair getBankAccount(){ return bankAccountPair; }

    @Override public String toString(){
        return "CitiCreditCsvTemplate{" +
                "bankAccountPair=" + bankAccountPair +
                ", debit=" + debit +
                ", credit=" + credit +
                ", description='" + description + '\'' +
                ", date=" + date +
                ", status='" + status + '\'' +
                ", memberName='" + memberName + '\'' +
                '}';
    }
}
