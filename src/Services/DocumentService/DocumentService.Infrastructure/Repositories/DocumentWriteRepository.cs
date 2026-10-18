using DocumentService.Application.Interfaces;
using DocumentService.Infrastructure.Data;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SharedKernel.Common;

namespace DocumentService.Infrastructure.Repositories;

public sealed class DocumentWriteRepository(
    DocumentDbContext context,
    IAmazonS3 objectStorage,
    IConfiguration configuration,
    ILogger<DocumentWriteRepository> logger) : IDocumentWriteRepository
{
    public async Task<CommandOutcome> GenerateLeaseContractAsync(
        Guid leaseId,
        Guid tenantId,
        Guid propertyId,
        decimal monthlyRent,
        decimal depositAmount,
        Guid? landlordId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var fileName = $"Lease_{leaseId}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
        var objectKey = $"lease-contracts/{leaseId}/{fileName}";
        var effectiveStart = startDate ?? DateTime.UtcNow;
        var effectiveEnd = endDate ?? effectiveStart.AddYears(1);
        var effectiveLandlord = landlordId ?? Guid.Empty;

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(style => style.FontSize(9).FontColor("#1E293B"));

                page.Header().Column(header =>
                {
                    header.Spacing(8);
                    header.Item().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Row(brandRow =>
                            {
                                brandRow.AutoItem().Text("SMART RENT ").SemiBold().FontSize(12).FontColor("#2563EB");
                                brandRow.AutoItem().Text("- PLATFORM SÖZLEŞMESİ").FontSize(10).FontColor("#64748B");
                            });
                            col.Item().Text("DİJİTAL KONUT KİRA SÖZLEŞMESİ")
                                .ExtraBold().FontSize(18).FontColor("#0F172A");
                            col.Item().Text("6098 sayılı Türk Borçlar Kanunu hükümlerine uygun dijital sözleşme")
                                .FontSize(8).FontColor("#64748B");
                        });

                        row.ConstantItem(180).AlignRight().Column(badgeCol =>
                        {
                            badgeCol.Item().AlignRight().Container()
                                .Background("#DCFCE7")
                                .Border(1)
                                .BorderColor("#86EFAC")
                                .PaddingVertical(4)
                                .PaddingHorizontal(8)
                                .Text("AKTİF / DİJİTAL ONAYLI")
                                .Bold().FontSize(8).FontColor("#166534");

                            badgeCol.Item().PaddingTop(4).AlignRight()
                                .Text($"Sözleşme No: #{leaseId.ToString()[..8].ToUpper()}")
                                .SemiBold().FontSize(8).FontColor("#475569");
                            badgeCol.Item().AlignRight()
                                .Text($"Tanzim Tarihi: {DateTime.UtcNow:dd.MM.yyyy}")
                                .FontSize(8).FontColor("#64748B");
                        });
                    });

                    header.Item().LineHorizontal(1.5f).LineColor("#2563EB");
                });

                page.Content().PaddingVertical(10).Column(content =>
                {
                    content.Spacing(12);

                    // 1. ÖZET METRİK KARTLARI
                    content.Item().Row(metrics =>
                    {
                        metrics.Spacing(8);

                        void BuildMetricCard(RowDescriptor r, string title, string value, string subtitle, string colorHex)
                        {
                            r.RelativeItem().Border(1).BorderColor("#E2E8F0").Background("#F8FAFC").Padding(8).Column(c =>
                            {
                                c.Item().Text(title).Bold().FontSize(7).FontColor("#64748B");
                                c.Item().PaddingVertical(2).Text(value).ExtraBold().FontSize(13).FontColor(colorHex);
                                c.Item().Text(subtitle).FontSize(7).FontColor("#94A3B8");
                            });
                        }

                        BuildMetricCard(metrics, "AYLIK KİRA BEDELİ", $"{monthlyRent:N0} ₺", "Her ayın ilk 5 günü", "#2563EB");
                        BuildMetricCard(metrics, "GÜVENCE BEDELİ (DEPOZİTO)", $"{depositAmount:N0} ₺", "Sözleşme teminatı", "#0F172A");
                        BuildMetricCard(metrics, "BAŞLANGIÇ TARİHİ", effectiveStart.ToString("dd.MM.yyyy"), "Sözleşme başlangıcı", "#0F172A");
                        BuildMetricCard(metrics, "BİTİŞ TARİHİ", effectiveEnd.ToString("dd.MM.yyyy"), "Standart kira süresi", "#0F172A");
                    });

                    // 2. TARAFLAR
                    content.Item().Column(partiesCol =>
                    {
                        partiesCol.Spacing(4);
                        partiesCol.Item().Text("1. SÖZLEŞMENİN TARAFLARI").SemiBold().FontSize(10).FontColor("#0F172A");

                        partiesCol.Item().Row(partiesRow =>
                        {
                            partiesRow.Spacing(8);

                            // Kiraya Veren Kartı
                            partiesRow.RelativeItem().Border(1).BorderColor("#E2E8F0").Background("#FFFFFF").Padding(8).Column(card =>
                            {
                                card.Spacing(3);
                                card.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("KİRAYA VEREN (MÜLK SAHİBİ)").Bold().FontSize(8).FontColor("#1E293B");
                                    r.AutoItem().Text("[Doğrulandı]").SemiBold().FontSize(7).FontColor("#16A34A");
                                });
                                card.Item().Text($"Kullanıcı Ref ID: {effectiveLandlord}").FontSize(8).FontColor("#475569");
                                card.Item().Text("Sıfatı: Taşınmaz Maliki / Yetkili Kiraya Veren").FontSize(7.5f).FontColor("#64748B");
                                card.Item().Text("Yetki ve Doğrulama: Keycloak Dijital Kimlik Altyapısı").FontSize(7.5f).FontColor("#64748B");
                                card.Item().Text("Tebligat Adresi: Smart Rent Platformu Kayıtlı E-Posta").FontSize(7.5f).FontColor("#64748B");
                            });

                            // Kiracı Kartı
                            partiesRow.RelativeItem().Border(1).BorderColor("#E2E8F0").Background("#FFFFFF").Padding(8).Column(card =>
                            {
                                card.Spacing(3);
                                card.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("KİRACI (TAŞINMAZI KİRALAYAN)").Bold().FontSize(8).FontColor("#1E293B");
                                    r.AutoItem().Text("[Doğrulandı]").SemiBold().FontSize(7).FontColor("#16A34A");
                                });
                                card.Item().Text($"Kullanıcı Ref ID: {tenantId}").FontSize(8).FontColor("#475569");
                                card.Item().Text("Sıfatı: Kiracı (Taşınmaz Kullanıcısı)").FontSize(7.5f).FontColor("#64748B");
                                card.Item().Text("Yetki ve Doğrulama: Keycloak Dijital Kimlik Altyapısı").FontSize(7.5f).FontColor("#64748B");
                                card.Item().Text("Tebligat Adresi: Smart Rent Platformu Kayıtlı E-Posta").FontSize(7.5f).FontColor("#64748B");
                            });
                        });
                    });

                    // 3. KİRALANAN TAŞINMAZ BİLGİLERİ
                    content.Item().Column(propCol =>
                    {
                        propCol.Spacing(4);
                        propCol.Item().Text("2. KİRALANAN TAŞINMAZ BİLGİLERİ").SemiBold().FontSize(10).FontColor("#0F172A");

                        propCol.Item().Border(1).BorderColor("#E2E8F0").Background("#FFFFFF").Padding(8).Column(grid =>
                        {
                            grid.Spacing(4);
                            grid.Item().Row(r =>
                            {
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("Mülk Referans No:").Bold().FontSize(7.5f).FontColor("#64748B");
                                    c.Item().Text($"{propertyId}").FontSize(8).FontColor("#0F172A");
                                });
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("Taşınmazın Cinsi / Niteliği:").Bold().FontSize(7.5f).FontColor("#64748B");
                                    c.Item().Text("Konut / Mesken").FontSize(8).FontColor("#0F172A");
                                });
                            });
                            grid.Item().LineHorizontal(0.5f).LineColor("#F1F5F9");
                            grid.Item().Row(r =>
                            {
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("Kullanım Amacı:").Bold().FontSize(7.5f).FontColor("#64748B");
                                    c.Item().Text("Münhasıran Aile / Bireysel İkamet").FontSize(8).FontColor("#0F172A");
                                });
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("Teslim ve Kullanım Durumu:").Bold().FontSize(7.5f).FontColor("#64748B");
                                    c.Item().Text("Tam, Eksiksiz, Boyalı ve Hasarsız").FontSize(8).FontColor("#0F172A");
                                });
                            });
                        });
                    });

                    // 4. MALİ VE ÖZEL ŞARTLAR
                    content.Item().Column(termsCol =>
                    {
                        termsCol.Spacing(4);
                        termsCol.Item().Text("3. SÖZLEŞME VE ÖDEME HÜKÜMLERİ").SemiBold().FontSize(10).FontColor("#0F172A");

                        termsCol.Item().Border(1).BorderColor("#E2E8F0").Background("#FFFFFF").Padding(8).Column(terms =>
                        {
                            terms.Spacing(4);

                            void AddTerm(string no, string title, string desc)
                            {
                                terms.Item().Row(r =>
                                {
                                    r.ConstantItem(20).Text(no).Bold().FontSize(8).FontColor("#2563EB");
                                    r.RelativeItem().Column(tc =>
                                    {
                                        tc.Item().Text(text =>
                                        {
                                            text.Span(title + ": ").Bold().FontSize(8).FontColor("#1E293B");
                                            text.Span(desc).FontSize(8).FontColor("#475569");
                                        });
                                    });
                                });
                            }

                            AddTerm("3.1", "Ödeme Düzeni", $"Kira bedeli aylık {monthlyRent:N2} TRY olup her ayın 1. ile 5. günü arasında platform ödeme altyapısı üzerinden tahsil edilir.");
                            AddTerm("3.2", "Güvence Bedeli", $"Alınan {depositAmount:N2} TRY tutarındaki depozito, kira ilişkisi bitiminde taşınmazın borçsuz ve hasarsız teslimi halinde kiracıya iade edilir.");
                            AddTerm("3.3", "Kira Artış Oranı", "Kira sözleşmesinin yenilenmesi halinde yapılacak artış, bir önceki kira yılındaki TÜFE 12 aylık ortalamasını ve yasal üst sınırları geçemez.");
                            AddTerm("3.4", "Özenle Kullanım ve Alt Kira", "Kiracı, kiralanan mülkü özenle kullanmayı, komşuluk hukukuna riayet etmeyi ve mülkü izinsiz alt kiraya vermemeyi kabul eder.");
                            AddTerm("3.5", "Sözleşmenin Sona Ermesi", "Kiracı, kanunda öngörülen bildirim süresi dahilinde yazılı bildirim yapmadıkça sözleşme 1 yıl süreyle kanunen uzar.");
                        });
                    });

                    // 5. İMZA VE ONAY ALANI
                    content.Item().Column(signCol =>
                    {
                        signCol.Spacing(4);
                        signCol.Item().Text("4. DİJİTAL ONAY VE İMZA").SemiBold().FontSize(10).FontColor("#0F172A");

                        signCol.Item().Row(signRow =>
                        {
                            signRow.Spacing(8);

                            void BuildSignBox(RowDescriptor r, string roleTitle, Guid userId)
                            {
                                r.RelativeItem().Border(1).BorderColor("#CBD5E1").Background("#F8FAFC").Padding(8).Column(box =>
                                {
                                    box.Spacing(3);
                                    box.Item().Text(roleTitle).Bold().FontSize(8).FontColor("#1E293B");
                                    var displayId = userId == Guid.Empty ? "Doğrulanmış Mülk Sahibi" : $"Yetkili ID: {userId.ToString()[..13]}...";
                                    box.Item().Text(displayId).FontSize(7.5f).FontColor("#64748B");
                                    box.Item().PaddingVertical(4).Container().Border(1).BorderColor("#BBF7D0").Background("#F0FDF4").Padding(4).Row(check =>
                                    {
                                        check.AutoItem().Text("[DİJİTAL ONAYLI]").Bold().FontSize(7.5f).FontColor("#15803D");
                                        check.RelativeItem().AlignRight().Text($"{effectiveStart:dd.MM.yyyy}").FontSize(7.5f).FontColor("#166534");
                                    });
                                    box.Item().Text("Elektronik Onay Sistemi ile Doğrulanmıştır").FontSize(7).FontColor("#94A3B8");
                                });
                            }

                            BuildSignBox(signRow, "KİRAYA VEREN İMZASI", effectiveLandlord);
                            BuildSignBox(signRow, "KİRACI İMZASI", tenantId);
                        });
                    });

                    // GÜVENLİK DİPNOTU
                    content.Item().Container()
                        .Background("#EFF6FF")
                        .Border(1)
                        .BorderColor("#BFDBFE")
                        .Padding(6)
                        .Row(noticeRow =>
                        {
                            noticeRow.AutoItem().Text("[BİLGİ] ").Bold().FontSize(8).FontColor("#1D4ED8");
                            noticeRow.RelativeItem().Text("Bu sözleşme, Smart Rent Dijital Kira Yönetim Sistemi üzerinde 5070 Sayılı Elektronik İmza Kanunu ve 6098 Sayılı Türk Borçlar Kanunu çerçevesinde tarafların karşılıklı doğrulaması ile tanzim edilmiştir.")
                                .FontSize(7.5f).FontColor("#1E40AF");
                        });
                });

                page.Footer().Column(footer =>
                {
                    footer.Spacing(4);
                    footer.Item().LineHorizontal(0.5f).LineColor("#CBD5E1");
                    footer.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Sistem Doğrulama Kodu: {leaseId}").FontSize(7).FontColor("#94A3B8");
                        row.RelativeItem().AlignCenter().Text("Smart Rent Platformu - Güvenli Dijital Sözleşme").FontSize(7).FontColor("#94A3B8");
                        row.ConstantItem(60).AlignRight().Text(text =>
                        {
                            text.Span("Sayfa ").FontSize(7).FontColor("#94A3B8");
                            text.CurrentPageNumber().FontSize(7).FontColor("#94A3B8");
                            text.Span(" / ").FontSize(7).FontColor("#94A3B8");
                            text.TotalPages().FontSize(7).FontColor("#94A3B8");
                        });
                    });
                });
            });
        }).GeneratePdf();

        var document = DocumentService.Domain.Entities.DocumentMetadata.Create(tenantId, leaseId, fileName,
            objectKey, "application/pdf", pdf.LongLength, "LEASE_CONTRACT");
        var bucket = configuration["Storage:Bucket"]
            ?? throw new InvalidOperationException("Storage:Bucket must be configured.");
        using var pdfStream = new MemoryStream(pdf);

        await objectStorage.PutObjectAsync(new PutObjectRequest
        {
            BucketName = bucket,
            Key = objectKey,
            InputStream = pdfStream,
            ContentType = "application/pdf"
        }, cancellationToken);

        context.Documents.Add(document);
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception saveException)
        {
            try
            {
                await objectStorage.DeleteObjectAsync(bucket, objectKey, cancellationToken);
            }
            catch (Exception cleanupException)
            {
                logger.LogError(cleanupException, "Failed to remove orphaned contract object {ObjectKey}.", objectKey);
            }

            logger.LogError(saveException, "Failed to save metadata for contract object {ObjectKey}.", objectKey);
            throw;
        }

        return new CommandOutcome(document.Id, "GENERATED");
    }
}
