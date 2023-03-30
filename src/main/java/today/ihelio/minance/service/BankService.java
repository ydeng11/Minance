package today.ihelio.minance.service;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.Transactional;
import today.ihelio.minance.model.Bank;
import today.ihelio.minance.repository.BankRepository;

import static javax.transaction.Transactional.TxType.REQUIRED;
import static javax.transaction.Transactional.TxType.REQUIRES_NEW;
import static javax.transaction.Transactional.TxType.SUPPORTS;

@Singleton
@Transactional(REQUIRED)
public class BankService {
  @Inject BankRepository bankRepository;

  @Transactional
  public Bank creatBank(String bankName) {
    Bank bank = new Bank();
    bank.setName(bankName);
    bankRepository.persist(bank);
    return bank;
  }

  @Transactional
  public void deleteBank(Bank bank) {
    bankRepository.delete(bank);
  }

  @Transactional(REQUIRES_NEW)
  public Bank updateBank(Bank bank) {
    Bank existing = bankRepository.findById(bank.id);
    existing.setName(bank.getName());
    existing.persist();
    return existing;
  }

  @Transactional(SUPPORTS)
  public Bank findBankById(long bankId) {
    return bankRepository.findById(bankId);
  }

  @Transactional(SUPPORTS)
  public Bank findBankByName(String name) {
    return bankRepository.find("name", name).firstResult();
  }
}
