package today.ihelio.minance.model;

import javax.ws.rs.FormParam;

public class AccountCreationForm {
  @FormParam("bank")
  public String bankName;
  @FormParam("account")
  public String account;
  @FormParam("type")
  public Account.AccountType type;
  @FormParam("balance")
  public double balance;
}
