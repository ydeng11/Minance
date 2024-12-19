package today.ihelio.startupeventslisteners;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Singleton;
import org.jboss.logging.Logger;

@Singleton
public class EnvironmentLogger {

	private static final Logger LOGGER = Logger.getLogger(EnvironmentLogger.class);

	void onStart(@Observes StartupEvent ev) {
		String dataEnv = System.getenv("DATA");
		if (dataEnv != null) {
			LOGGER.infof("Environment Variable DATA: %s", dataEnv);
		} else {
			LOGGER.warn("Environment Variable DATA is not set.");
		}
	}
}