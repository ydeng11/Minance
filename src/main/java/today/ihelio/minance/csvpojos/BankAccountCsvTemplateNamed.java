package today.ihelio.minance.csvpojos;

import jakarta.inject.Qualifier;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Qualifier
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.FIELD})
public @interface BankAccountCsvTemplateNamed {
  BankAccountPair.BankName bankName();

  BankAccountPair.AccountType accountType();
}
