# Generated by Django 5.0.2 on 2024-03-11 23:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0005_vote_confirmed_vote_backend_vot_confirm_513175_idx'),
    ]

    operations = [
        migrations.AlterField(
            model_name='vote',
            name='confirmed',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='vote',
            name='contactable',
            field=models.BooleanField(default=False),
        ),
    ]