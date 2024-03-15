# Generated by Django 5.0.2 on 2024-03-12 00:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0006_alter_vote_confirmed_alter_vote_contactable'),
    ]

    operations = [
        migrations.AddField(
            model_name='vote',
            name='token',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddIndex(
            model_name='vote',
            index=models.Index(fields=['token'], name='backend_vot_token_a47edd_idx'),
        ),
    ]