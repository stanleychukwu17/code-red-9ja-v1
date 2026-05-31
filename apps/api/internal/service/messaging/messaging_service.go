package messagingservice

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/twilio/twilio-go"
	openapi "github.com/twilio/twilio-go/rest/api/v2010"
)

type MessagingService struct {
	client       *twilio.RestClient
	whatsappFrom string
	smsFrom      string
}

func NewMessagingService() (*MessagingService, error) {
	accountSid := os.Getenv("TWILIO_ACCOUNT_SID")
	authToken := os.Getenv("TWILIO_AUTH_TOKEN")
	whatsappFrom := os.Getenv("TWILIO_WHATSAPP_FROM")
	smsFrom := os.Getenv("TWILIO_SMS_FROM")

	if accountSid == "" || authToken == "" {
		return nil, fmt.Errorf("twilio client not initialized")
	}

	params := twilio.ClientParams{
		Username: accountSid,
		Password: authToken,
	}

	return &MessagingService{
		client:       twilio.NewRestClientWithParams(params),
		whatsappFrom: whatsappFrom,
		smsFrom:      smsFrom,
	}, nil
}

func (s *MessagingService) SendWhatsAppOTP(phone, otp string) error {
	slog.Info("Sending otp to whatsapp: ", "otp", otp) // remove this line from production

	message := fmt.Sprintf("Your Free9ja OTP is: %s", otp)
	to := fmt.Sprintf("whatsapp:%s", phone)

	params := &openapi.CreateMessageParams{}
	params.SetTo(to)
	params.SetFrom(s.whatsappFrom)
	params.SetBody(message)

	_, err := s.client.Api.CreateMessage(params)
	if err != nil {
		return fmt.Errorf("failed to send WhatsApp message: %w", err)
	}

	return nil
}

func (s *MessagingService) SendSmsOTP(phone, otp string) error {
	slog.Info("Sending otp to SMS: ", "otp", otp) // remove this line from production

	message := fmt.Sprintf("Your Free9ja OTP is: %s", otp)

	params := &openapi.CreateMessageParams{}
	params.SetTo(phone)
	params.SetFrom(s.smsFrom)
	params.SetBody(message)

	_, err := s.client.Api.CreateMessage(params)
	if err != nil {
		return fmt.Errorf("failed to send SMS message: %w", err)
	}

	return nil
}
