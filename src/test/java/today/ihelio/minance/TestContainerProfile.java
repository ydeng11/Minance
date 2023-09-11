package today.ihelio.minance;

import com.google.common.collect.ImmutableMap;
import io.quarkus.test.junit.QuarkusTestProfile;
import java.util.HashMap;
import java.util.Map;

public class TestContainerProfile implements QuarkusTestProfile {
  public Map<String, String> getConfigOverrides() {
    var overrides = new HashMap<String, String>();
    overrides.put("quarkus.datasource.db-kind", "mysql");
    overrides.put("quarkus.datasource.devservices.db-name", "minance");
    overrides.put("quarkus.datasource.devservices.username", "quarkus");
    overrides.put("quarkus.datasource.devservices.password", "quarkus");
    overrides.put("quarkus.datasource.devservices.port", "30301");
    overrides.put("quarkus.flyway.enabled", "true");
    overrides.put("quarkus.flyway.migrate-at-start", "true");
    overrides.put("quarkus.flyway.username", "quarkus");
    overrides.put("quarkus.flyway.password", "quarkus");
    overrides.put("quarkus.flyway.jdbc-url",
        "jdbc:mysql://127.0.0.1:30301/minance?createDatabaseIfNotExist=true");
    overrides.put("quarkus.flyway.default-schema", "minance");
    return ImmutableMap.copyOf(overrides);
  }
}
