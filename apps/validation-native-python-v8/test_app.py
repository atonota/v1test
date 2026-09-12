import unittest
from app import MESSAGE
class Behavior(unittest.TestCase):
    def test_message_is_an_accepted_revision(self):
        self.assertIn(MESSAGE, ("baseline", "changed"))
if __name__ == "__main__": unittest.main()
