require 'net/smtp'

FROM_EMAIL = "mail@example.com"
PASSWORD = "strong-email-password"
TO_EMAIL = "recepient@email.com"

smtp = Net::SMTP.new 'smtp.address', 587

message = <<END_OF_MESSAGE
From: John Doe <mail@example.com>
To: Jane Doe <recepient@email.com>
Subject: Sending email with Ruby 
Hello.
This is an email ‌sent with Ruby.
END_OF_MESSAGE

smtp.start('received-from-goes-here', FROM_EMAIL, PASSWORD, :plain)
smtp.send_message(message, FROM_EMAIL, TO_EMAIL)
smtp.finish()