package today.ihelio.minance.service;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import today.ihelio.jooq.tables.pojos.Banks;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static today.ihelio.minance.csvpojos.BankAccountPair.BankName.CITI;

@QuarkusTest
public class BankServiceTest {
	@Inject
	BankService bankService;
	@Inject
	Flyway flyway;

	@BeforeEach
	void setUp() {
		flyway.clean();
		flyway.migrate();
	}

	@AfterEach
	void clean() {
		flyway.clean();
	}

	@Test
	public void testBankService_CreateDeleteBanks() throws Exception {
		assertThat(bankService.create(CITI)).isPresent();

		assertThat(bankService.retrieveAll().size()).isEqualTo(1);

		assertThat(bankService.delete(CITI)).isEqualTo(1);

		assertThat(bankService.retrieveAll().size()).isEqualTo(0);
	}

	@Test
	public void testBankService_RetrieveBanks() throws Exception {
		assertThat(bankService.create(CITI)).isPresent();

		Banks citi = bankService.findBankByName(CITI).orElseThrow();
		assertThat(citi.getBankName()).isEqualTo(CITI.getName());

		assertThat(bankService.retrieve(citi.getBankId())).contains(citi);
	}

	@Test
	public void testBankService_RetrieveNonexistentBanks() throws Exception {
		Optional<Banks> citi = bankService.findBankByName(CITI);
		assertThat(citi).isEmpty();
	}
}
