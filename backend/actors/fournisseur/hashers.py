from django.contrib.auth.hashers import BasePasswordHasher
from werkzeug.security import check_password_hash

class WerkzeugPasswordHasher(BasePasswordHasher):
    """
    A password hasher that checks passwords against Werkzeug hashes
    from the legacy Flask MongoDB backend.
    """
    algorithm = "werkzeug"

    def verify(self, password, encoded):
        """Check if the given password is correct."""
        # encoded starts with 'werkzeug$' followed by the hash
        # example: werkzeug$pbkdf2:sha256:... or werkzeug$scrypt:...
        algorithm, actual_hash = encoded.split('$', 1)
        if algorithm != self.algorithm:
            return False
        return check_password_hash(actual_hash, password)

    def encode(self, password, salt):
        raise NotImplementedError("Werkzeug passwords are only for legacy auth validation.")

    def safe_summary(self, encoded):
        return {"algorithm": self.algorithm}
