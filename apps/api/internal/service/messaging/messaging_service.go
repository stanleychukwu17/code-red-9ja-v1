package messagingservice

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/twilio/twilio-go"
)

type MessagingService struct {
	client       *twilio.RestClient
	whatsappFrom string
}

func NewMessagingService() (*MessagingService, error) {
	accountSid := os.Getenv("TWILIO_ACCOUNT_SID")
	authToken := os.Getenv("TWILIO_AUTH_TOKEN")
	whatsappFrom := os.Getenv("TWILIO_WHATSAPP_FROM")

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
	}, nil
}

func (s *MessagingService) SendWhatsAppOTP(phone, otp string) error {
	slog.Info("Sending otp to whatsapp: ", "otp", otp) // remove this line from production
	// TODO: Implement WhatsApp OTP sending when i pay twilio
	return nil

	// message := fmt.Sprintf("Your Free9ja OTP is: %s", otp)
	// to := fmt.Sprintf("whatsapp:%s", phone)

	// fmt.Println(message)
	// params := &openapi.CreateMessageParams{}
	// params.SetTo(to)
	// params.SetFrom(s.whatsappFrom)
	// params.SetBody(message)

	// _, err := s.client.Api.CreateMessage(params)
	// if err != nil {
	// 	return fmt.Errorf("failed to send WhatsApp message: %w", err)
	// }

	// return nil
}
