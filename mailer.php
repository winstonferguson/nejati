<?php

    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        $name = strip_tags(trim($_POST["name"]));
        $name = str_replace(array("\r","\n"),array(" "," "),$name);
        $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
        $telephone = filter_var(trim($_POST["telephone"]), FILTER_SANITIZE_EMAIL);
        $message = trim($_POST["message"]);

        if ( empty($name) OR empty($message) OR !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            exit;
        }

        $recipient = "jwrferguson@gmail.com";
        $subject = 'Message from Nejati Clinic site visitor '.$name;
        $email_content = "Name: $name\n";
        $email_content .= "Email: $email\n\n";
        $email_content .= "Telephone: $telephone\n\n";
        $email_content .= "Message:\n$message\n";
        $email_headers = "From: $name <$email>";

        if (mail($recipient, $subject, $email_content, $email_headers)) {
            http_response_code(200);
        } else {
            http_response_code(400);
        }

    } else {
        http_response_code(400);
    }
  
  ?>